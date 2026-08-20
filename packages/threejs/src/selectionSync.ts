import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import {Box3, BoxHelper, Raycaster, Vector2, Vector3} from 'three'
import type {Camera, Object3D, Scene, WebGLRenderer} from 'three'
import {EXTENSION_ID} from './constants'
import {
  getObject3DForSheetObject,
  resolveRegisteredAncestor,
} from './objectRegistry'
import type {StudioLike} from './persistence'

const POINTER_DRAG_THRESHOLD_PX = 3
const SELECTION_HELPER_FLAG = `${EXTENSION_ID}:selectionHelper`
/** World-space size used when the selected object has no geometry (empty Object3D). */
const MIN_SELECTION_BOX_SIZE = 1

const _selectionBox = new Box3()
const _selectionCenter = new Vector3()

/**
 * BoxHelper.update() no-ops when Box3.setFromObject() is empty, leaving a
 * degenerate (invisible) wireframe. Expand to a minimum cube at the object's
 * world position so empty Object3Ds still show a yellow selection box in orbit mode.
 */
function applyMinimumSelectionBoxIfEmpty(
  boxHelper: BoxHelper,
  object3d: Object3D,
): void {
  _selectionBox.setFromObject(object3d)
  if (!_selectionBox.isEmpty()) return

  object3d.getWorldPosition(_selectionCenter)
  const half = MIN_SELECTION_BOX_SIZE / 2
  const minX = _selectionCenter.x - half
  const minY = _selectionCenter.y - half
  const minZ = _selectionCenter.z - half
  const maxX = _selectionCenter.x + half
  const maxY = _selectionCenter.y + half
  const maxZ = _selectionCenter.z + half

  // Corner order matches three.js BoxHelper.update()
  const position = boxHelper.geometry.attributes.position
  const array = position.array as Float32Array

  array[0] = maxX
  array[1] = maxY
  array[2] = maxZ
  array[3] = minX
  array[4] = maxY
  array[5] = maxZ
  array[6] = minX
  array[7] = minY
  array[8] = maxZ
  array[9] = maxX
  array[10] = minY
  array[11] = maxZ
  array[12] = maxX
  array[13] = maxY
  array[14] = minZ
  array[15] = minX
  array[16] = maxY
  array[17] = minZ
  array[18] = minX
  array[19] = minY
  array[20] = minZ
  array[21] = maxX
  array[22] = minY
  array[23] = minZ

  position.needsUpdate = true
  boxHelper.geometry.computeBoundingSphere()
}

export type SelectionSyncConfig = {
  studio: StudioLike
  renderer: WebGLRenderer
  getActiveScene: () => Scene
  getCamera: () => Camera
  isOrbitMode: () => boolean
}

export type SelectionSync = {
  refresh: () => void
  update: () => void
  dispose: () => void
}

function isSheetObject(item: ISheetObject | ISheet): item is ISheetObject {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'Theatre_SheetObject_PublicAPI'
  )
}

function isDevtoolsHelper(object: Object3D): boolean {
  return (
    object.userData[SELECTION_HELPER_FLAG] === true ||
    object.type === 'CameraHelper' ||
    object.type === 'BoxHelper'
  )
}

export function setupSelectionSync(config: SelectionSyncConfig): SelectionSync {
  const {studio, renderer, getActiveScene, getCamera, isOrbitMode} = config
  const domElement = renderer.domElement

  let boxHelper: BoxHelper | null = null
  let helperScene: Scene | null = null
  const pointerDown = new Vector2()
  const pointerUp = new Vector2()
  const raycaster = new Raycaster()

  const clearBoxHelper = () => {
    if (boxHelper && helperScene) {
      helperScene.remove(boxHelper)
      boxHelper.dispose()
      boxHelper = null
      helperScene = null
    }
  }

  const showBoxHelperForObject = (object3d: Object3D) => {
    const scene = getActiveScene()
    clearBoxHelper()

    boxHelper = new BoxHelper(object3d)
    boxHelper.userData[SELECTION_HELPER_FLAG] = true
    scene.add(boxHelper)
    helperScene = scene
    boxHelper.update()
    applyMinimumSelectionBoxIfEmpty(boxHelper, object3d)
  }

  const updateSelectionHighlight = (
    selection: Array<ISheetObject | ISheet>,
  ) => {
    if (!isOrbitMode()) {
      clearBoxHelper()
      return
    }

    const sheetObjects = selection.filter(isSheetObject)
    const activeScene = getActiveScene()

    for (const sheetObject of sheetObjects) {
      const object3d = getObject3DForSheetObject(sheetObject)
      if (!object3d) continue

      let current: Object3D | null = object3d
      while (current) {
        if (current === activeScene) {
          showBoxHelperForObject(object3d)
          return
        }
        current = current.parent
      }
    }

    clearBoxHelper()
  }

  const onPointerDown = (event: PointerEvent) => {
    pointerDown.set(event.clientX, event.clientY)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!isOrbitMode()) return

    pointerUp.set(event.clientX, event.clientY)
    const dx = pointerUp.x - pointerDown.x
    const dy = pointerUp.y - pointerDown.y
    if (
      dx * dx + dy * dy >
      POINTER_DRAG_THRESHOLD_PX * POINTER_DRAG_THRESHOLD_PX
    ) {
      return
    }

    const rect = domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const camera = getCamera()
    raycaster.setFromCamera(new Vector2(x, y), camera)

    const intersects = raycaster.intersectObjects(
      getActiveScene().children,
      true,
    )
    for (const hit of intersects) {
      if (isDevtoolsHelper(hit.object)) continue

      const resolved = resolveRegisteredAncestor(hit.object)
      if (resolved) {
        studio.setSelection([resolved.sheetObject])
        return
      }
    }

    studio.setSelection([])
  }

  const unsubscribeFromSelection = studio.onSelectionChange(
    updateSelectionHighlight,
  )

  domElement.addEventListener('pointerdown', onPointerDown)
  domElement.addEventListener('pointerup', onPointerUp)

  updateSelectionHighlight(studio.selection)

  return {
    refresh() {
      updateSelectionHighlight(studio.selection)
    },
    update() {
      if (!isOrbitMode()) {
        if (boxHelper) {
          clearBoxHelper()
        }
        return
      }

      if (boxHelper) {
        boxHelper.update()
        applyMinimumSelectionBoxIfEmpty(boxHelper, boxHelper.object)
      }
    },
    dispose() {
      unsubscribeFromSelection()
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('pointerup', onPointerUp)
      clearBoxHelper()
    },
  }
}
