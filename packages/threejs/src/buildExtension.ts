import type {TheatreExtension, ToolsetConfig} from './types'
import {isRemoteEditorWindow} from '@unseenco/theatre-core'
import {
  isRemoteEditorOpen,
  onRemoteEditorOpenChange,
} from '@unseenco/theatre-studio/remoteEditor'
import {PerspectiveCamera} from 'three'
import type {Camera, Scene, WebGLRenderer} from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {EXTENSION_ID} from './constants'
import {cameraIcon, orbitIcon} from './icons'
import {
  createActiveSceneStateObject,
  createDevtoolsStateObject,
  createInitialDevtoolsStateFromCamera,
  getDevtoolsObjectKey,
  persistActiveSceneName,
  persistCameraProps,
  persistOrbitEnabled,
} from './persistence'
import type {
  DevtoolsState,
  DevtoolsStateObject,
  StudioLike,
} from './persistence'

export {EXTENSION_ID} from './constants'

export interface SceneConfig {
  name?: string
  scene: Scene
  camera: Camera
}

export type SceneSwitchCallback = (name: string, scene: Scene) => void

type NormalizedScene = {
  name: string
  scene: Scene
  camera: Camera
}

export interface ThreejsDevtoolsConfig {
  renderer: WebGLRenderer
  studio: StudioLike
  scenes: SceneConfig[]
}

export interface ThreejsDevtools {
  extension: TheatreExtension
  getCamera(): Camera
  update(): void
  dispose(): void
  onSceneSwitch(callback: SceneSwitchCallback): () => void
}

type CameraMode = 'scene' | 'orbit'

function normalizeScenes(scenes: SceneConfig[]): NormalizedScene[] {
  if (!scenes || scenes.length === 0) {
    throw new Error(
      'buildExtension() requires a non-empty `scenes` array in its config.',
    )
  }

  const usedNames = new Set<string>()
  let unnamedSceneCount = 0

  return scenes.map((entry) => {
    let name = entry.name?.trim() || entry.scene.name.trim()

    if (!name) {
      unnamedSceneCount += 1
      name = unnamedSceneCount === 1 ? 'Scene' : `Scene ${unnamedSceneCount}`
    }

    while (usedNames.has(name)) {
      unnamedSceneCount += 1
      name = `Scene ${unnamedSceneCount}`
    }

    usedNames.add(name)

    return {
      name,
      scene: entry.scene,
      camera: entry.camera,
    }
  })
}

export function buildExtension(config: ThreejsDevtoolsConfig): ThreejsDevtools {
  const {renderer, studio, scenes} = config
  const normalizedScenes = normalizeScenes(scenes)

  let activeSceneIndex = 0
  let mode: CameraMode = 'scene'
  let setToolbar: ((config: ToolsetConfig) => void) | null = null
  let pendingOrbitEnabled: boolean | undefined
  let hasRemoteEditorUserToggledOrbit = false
  let modeBeforeRemoteEditor: CameraMode | undefined
  const sceneSwitchListeners = new Set<SceneSwitchCallback>()

  const getActiveScene = () => normalizedScenes[activeSceneIndex]
  const getActiveSceneCamera = () => getActiveScene().camera
  const getActiveStateObj = () => sceneStateObjects[activeSceneIndex]

  const width = renderer.domElement.clientWidth || window.innerWidth
  const height = renderer.domElement.clientHeight || window.innerHeight
  const initialCamera = normalizedScenes[0].camera
  const initialFov =
    initialCamera instanceof PerspectiveCamera ? initialCamera.fov : 60

  const orbitCamera = new PerspectiveCamera(
    initialFov,
    width / height,
    0.1,
    1000,
  )
  orbitCamera.position.copy(initialCamera.position)
  orbitCamera.quaternion.copy(initialCamera.quaternion)

  const controls = new OrbitControls(orbitCamera, renderer.domElement)
  controls.enabled = false
  controls.target.set(0, 0, 0)

  const sceneStateObjects: DevtoolsStateObject[] = normalizedScenes.map(
    (entry) =>
      createDevtoolsStateObject(
        studio,
        getDevtoolsObjectKey(entry.name),
        createInitialDevtoolsStateFromCamera(entry.camera),
      ),
  )
  const sceneStates: Array<DevtoolsState | undefined> = normalizedScenes.map(
    () => undefined,
  )
  const activeSceneStateObj = createActiveSceneStateObject(
    studio,
    normalizedScenes[0].name,
  )

  const shouldPersistDevtoolsState = () => !isRemoteEditorWindow()

  const syncOrbitCameraFromSceneCamera = (camera: Camera) => {
    orbitCamera.position.copy(camera.position)
    orbitCamera.quaternion.copy(camera.quaternion)
    if (camera instanceof PerspectiveCamera) {
      orbitCamera.fov = camera.fov
      orbitCamera.updateProjectionMatrix()
    }
    controls.target.set(0, 0, 0)
  }

  const applyActiveSceneDevtoolsState = () => {
    const cachedState = sceneStates[activeSceneIndex]
    if (cachedState) {
      applyDevtoolsState(cachedState)
      return
    }

    syncOrbitCameraFromSceneCamera(getActiveSceneCamera())
    setOrbitModeLocal(false)
  }

  const notifySceneSwitch = () => {
    const activeScene = getActiveScene()
    for (const listener of sceneSwitchListeners) {
      listener(activeScene.name, activeScene.scene)
    }
    updateToolbarConfig()
  }

  const applySceneSwitchSideEffects = () => {
    if (isRemoteEditorWindow()) {
      applyActiveSceneDevtoolsState()
    } else if (isRemoteEditorOpen() || modeBeforeRemoteEditor !== undefined) {
      // Main window while the remote editor is open: switch the rendered scene
      // without changing local camera mode or orbit pose.
    } else {
      applyActiveSceneDevtoolsState()
    }

    notifySceneSwitch()
  }

  const findSceneIndexByName = (sceneName: string) =>
    normalizedScenes.findIndex((entry) => entry.name === sceneName)

  const switchToScene = (index: number, source: 'user' | 'sync' = 'user') => {
    if (index < 0 || index === activeSceneIndex) return

    activeSceneIndex = index

    if (source === 'user') {
      persistActiveSceneName(
        studio,
        activeSceneStateObj,
        normalizedScenes[index].name,
      )
    }

    applySceneSwitchSideEffects()
  }

  const updateToolbarConfig = () => {
    if (!setToolbar) return

    const toolbarConfig: ToolsetConfig = []

    if (normalizedScenes.length > 1) {
      toolbarConfig.push({
        type: 'Flyout',
        label: `Scene: ${getActiveScene().name}`,
        items: normalizedScenes.map((entry, index) => ({
          label: entry.name,
          onClick: () => {
            switchToScene(index)
          },
        })),
      })
    }

    toolbarConfig.push({
      type: 'Switch',
      value: mode === 'orbit' ? 'orbit' : 'scene',
      onChange: (value) => {
        setOrbitMode(value === 'orbit')
      },
      options: [
        {
          value: 'scene',
          label: 'Scene camera',
          svgSource: cameraIcon,
        },
        {
          value: 'orbit',
          label: 'Orbit camera',
          svgSource: orbitIcon,
        },
      ],
    })

    setToolbar(toolbarConfig)
  }

  const setOrbitModeLocal = (enabled: boolean) => {
    mode = enabled ? 'orbit' : 'scene'
    controls.enabled = enabled
    updateToolbarConfig()
  }

  const shouldApplyOrbitModeFromState = (orbitEnabled: boolean) => {
    if (pendingOrbitEnabled !== undefined) return true
    return orbitEnabled !== (mode === 'orbit')
  }

  const applyCameraProps = (values: DevtoolsState) => {
    orbitCamera.position.copy(values.position)
    controls.target.copy(values.target)
  }

  const applyDevtoolsState = (values: DevtoolsState) => {
    if (
      pendingOrbitEnabled !== undefined &&
      values.orbitEnabled !== pendingOrbitEnabled
    ) {
      applyCameraProps(values)
      return
    }

    if (pendingOrbitEnabled !== undefined) {
      pendingOrbitEnabled = undefined
    }

    if (shouldApplyOrbitModeFromState(values.orbitEnabled)) {
      setOrbitModeLocal(values.orbitEnabled)
    }

    applyCameraProps(values)
    updateToolbarConfig()
  }

  const applyRemoteEditorState = (values: DevtoolsState) => {
    applyCameraProps(values)
    setOrbitModeLocal(true)
  }

  if (isRemoteEditorWindow()) {
    setOrbitModeLocal(true)
  }

  const unsubscribeFromState = sceneStateObjects.map((stateObj, index) =>
    stateObj.onValuesChange((values) => {
      sceneStates[index] = values

      if (index !== activeSceneIndex) return

      if (isRemoteEditorWindow()) {
        if (!hasRemoteEditorUserToggledOrbit) {
          applyRemoteEditorState(values)
        }
        return
      }

      // While the remote editor is open (or closing), keep the main window's
      // camera mode stable. Disconnect sync can fire onValuesChange before the
      // remote-close handler runs.
      if (isRemoteEditorOpen() || modeBeforeRemoteEditor !== undefined) {
        return
      }

      applyDevtoolsState(values)
    }),
  )

  const unsubscribeFromActiveScene = activeSceneStateObj.onValuesChange(
    (values) => {
      const index = findSceneIndexByName(values.activeSceneName)
      switchToScene(index, 'sync')
    },
  )

  const unsubscribeFromRemoteEditor = onRemoteEditorOpenChange((isOpen) => {
    if (isRemoteEditorWindow()) return

    if (isOpen) {
      modeBeforeRemoteEditor = mode
      setOrbitModeLocal(false)
      return
    }

    if (modeBeforeRemoteEditor !== undefined) {
      setOrbitMode(modeBeforeRemoteEditor === 'orbit')
      modeBeforeRemoteEditor = undefined
    }
  })

  const setOrbitMode = (enabled: boolean) => {
    if (isRemoteEditorWindow()) {
      hasRemoteEditorUserToggledOrbit = true
    } else if (shouldPersistDevtoolsState()) {
      pendingOrbitEnabled = enabled
    }
    setOrbitModeLocal(enabled)
    if (shouldPersistDevtoolsState()) {
      persistOrbitEnabled(studio, getActiveStateObj(), enabled)
    }
  }

  const updateTheatreCameraProps = () => {
    if (mode !== 'orbit' || !shouldPersistDevtoolsState()) return
    persistCameraProps(studio, getActiveStateObj(), orbitCamera, controls)
  }

  const onResize = () => {
    if (studio.ui.isDocked && studio.ui.dockedViewport !== null) return
    syncOrbitCameraAspect(window.innerWidth, window.innerHeight)
  }

  let lastOrbitWidth = 0
  let lastOrbitHeight = 0

  const syncOrbitCameraAspect = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return
    if (width === lastOrbitWidth && height === lastOrbitHeight) return
    lastOrbitWidth = width
    lastOrbitHeight = height
    orbitCamera.aspect = width / height
    orbitCamera.updateProjectionMatrix()
  }

  const unsubDockedResize = studio.ui.onDockedResize((viewport) => {
    if (viewport === null) {
      syncOrbitCameraAspect(window.innerWidth, window.innerHeight)
      return
    }
    syncOrbitCameraAspect(viewport.width, viewport.height)
  })

  window.addEventListener('resize', onResize)
  controls.addEventListener('end', updateTheatreCameraProps)

  const extension: TheatreExtension = {
    id: EXTENSION_ID,
    toolbars: {
      global(set) {
        setToolbar = set
        updateToolbarConfig()
        return () => {
          setToolbar = null
        }
      },
    },
  }

  return {
    extension,
    getCamera() {
      return mode === 'orbit' ? orbitCamera : getActiveSceneCamera()
    },
    update() {
      if (mode === 'orbit') {
        controls.update()
      }
    },
    onSceneSwitch(callback) {
      sceneSwitchListeners.add(callback)
      return () => {
        sceneSwitchListeners.delete(callback)
      }
    },
    dispose() {
      for (const unsubscribe of unsubscribeFromState) {
        unsubscribe()
      }
      unsubscribeFromActiveScene()
      unsubscribeFromRemoteEditor()
      unsubDockedResize()
      window.removeEventListener('resize', onResize)
      controls.removeEventListener('end', updateTheatreCameraProps)
      controls.dispose()
      sceneSwitchListeners.clear()
    },
  }
}
