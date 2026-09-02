import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import {TransformControls} from 'three/examples/jsm/controls/TransformControls.js'
import type {Camera, Object3D, Scene} from 'three'
import type {ThreejsRenderer} from './types'
import {
  getObject3DForSheetObject,
  getSheetObjectForObject3D,
} from './objectRegistry'
import {
  createObjectTransformScrub,
  sheetObjectHasTransformProps,
} from './persistObjectTransform'
import type {ObjectTransformScrub} from './persistObjectTransform'
import type {StudioLike} from './persistence'

export type TransformMode = 'translate' | 'rotate' | 'scale'
export type TransformSpace = 'world' | 'local'

export type TransformControlsSetupConfig = {
  studio: StudioLike
  renderer: ThreejsRenderer
  getActiveScene: () => Scene
  getCamera: () => Camera
  isOrbitMode: () => boolean
  setOrbitControlsEnabled: (enabled: boolean) => void
  onToolbarUpdateNeeded: () => void
}

export type TransformControlsSetup = {
  getMode: () => TransformMode
  setMode: (mode: TransformMode) => void
  getSpace: () => TransformSpace
  setSpace: (space: TransformSpace) => void
  isEnabled: () => boolean
  setEnabled: (enabled: boolean) => void
  hasSelectedObject: () => boolean
  refresh: () => void
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

function getSelectedTransformableObject(
  studio: StudioLike,
  activeScene: Scene,
): {object3d: Object3D; sheetObject: ISheetObject} | undefined {
  const sheetObjects = studio.selection.filter(isSheetObject)

  for (const sheetObject of sheetObjects) {
    if (!sheetObjectHasTransformProps(sheetObject)) continue

    const object3d = getObject3DForSheetObject(sheetObject)
    if (!object3d) continue

    let current: Object3D | null = object3d
    while (current) {
      if (current === activeScene) {
        return {object3d, sheetObject}
      }
      current = current.parent
    }
  }

  return undefined
}

function getAttachedTransformTarget(
  transformControls: TransformControls,
): {object3d: Object3D; sheetObject: ISheetObject} | undefined {
  const attached = transformControls.object
  if (!attached) return undefined

  const sheetObject = getSheetObjectForObject3D(attached)
  if (!sheetObject) return undefined

  return {object3d: attached, sheetObject}
}

export function setupTransformControls(
  config: TransformControlsSetupConfig,
): TransformControlsSetup {
  const {
    studio,
    renderer,
    getActiveScene,
    getCamera,
    isOrbitMode,
    setOrbitControlsEnabled,
    onToolbarUpdateNeeded,
  } = config

  let mode: TransformMode = 'translate'
  let space: TransformSpace = 'world'
  let enabled = false
  let hasSelection = false
  let transformControlsScene: Scene | null = null

  const transformScrub: ObjectTransformScrub =
    createObjectTransformScrub(studio)

  const transformControls = new TransformControls(
    getCamera(),
    renderer.domElement,
  )
  const transformControlsHelper = transformControls.getHelper()
  transformControls.setMode(mode)
  transformControls.setSpace(space)

  const syncTransformControlsScene = () => {
    const scene = getActiveScene()
    if (transformControlsScene === scene) return

    if (transformControlsScene) {
      transformControlsScene.remove(transformControlsHelper)
    }
    scene.add(transformControlsHelper)
    transformControlsScene = scene
  }

  const updateAttachment = () => {
    transformControls.camera = getCamera()

    if (!isOrbitMode() || !enabled) {
      transformControls.enabled = false
      transformControls.detach()
      hasSelection = false
      return
    }

    transformControls.enabled = true
    syncTransformControlsScene()

    const selected = getSelectedTransformableObject(studio, getActiveScene())
    if (selected) {
      transformControls.attach(selected.object3d)
      hasSelection = true
      return
    }

    transformControls.detach()
    hasSelection = false
  }

  const captureAttachedTransform = () => {
    const target = getAttachedTransformTarget(transformControls)
    if (!target) return

    transformScrub.capture(target.sheetObject, target.object3d)
  }

  const onMouseDown = () => {
    setOrbitControlsEnabled(false)
    transformScrub.begin()
  }

  const onObjectChange = () => {
    captureAttachedTransform()
  }

  const onMouseUp = () => {
    setOrbitControlsEnabled(true)
    captureAttachedTransform()
    transformScrub.end(true)
  }

  const onSelectionChange = () => {
    updateAttachment()
    onToolbarUpdateNeeded()
  }

  transformControls.addEventListener('mouseDown', onMouseDown)
  transformControls.addEventListener('objectChange', onObjectChange)
  transformControls.addEventListener('mouseUp', onMouseUp)

  const unsubscribeFromSelection = studio.onSelectionChange(onSelectionChange)

  updateAttachment()

  return {
    getMode: () => mode,
    setMode: (nextMode) => {
      mode = nextMode
      transformControls.setMode(nextMode)
      onToolbarUpdateNeeded()
    },
    getSpace: () => space,
    setSpace: (nextSpace) => {
      space = nextSpace
      transformControls.setSpace(nextSpace)
      onToolbarUpdateNeeded()
    },
    isEnabled: () => enabled,
    setEnabled: (nextEnabled) => {
      enabled = nextEnabled
      updateAttachment()
      onToolbarUpdateNeeded()
    },
    hasSelectedObject: () => hasSelection,
    refresh: () => {
      updateAttachment()
      onToolbarUpdateNeeded()
    },
    dispose: () => {
      transformScrub.end(false)
      transformControls.removeEventListener('mouseDown', onMouseDown)
      transformControls.removeEventListener('objectChange', onObjectChange)
      transformControls.removeEventListener('mouseUp', onMouseUp)
      unsubscribeFromSelection()

      if (transformControlsScene) {
        transformControlsScene.remove(transformControlsHelper)
        transformControlsScene = null
      }

      transformControls.dispose()
    },
  }
}
