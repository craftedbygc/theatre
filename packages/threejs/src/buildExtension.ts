import type {TheatreExtension, ToolsetConfig} from './types'
import {isRemoteEditorWindow} from '@unseenco/theatre-core'
import {
  isRemoteEditorOpen,
  onRemoteEditorOpenChange,
} from '@unseenco/theatre-studio/remoteEditor'
import {PerspectiveCamera} from 'three'
import type {Camera, WebGLRenderer} from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {EXTENSION_ID} from './constants'
import {cameraIcon, orbitIcon} from './icons'
import {
  createDevtoolsStateObject,
  persistCameraProps,
  persistOrbitEnabled,
} from './persistence'
import type {DevtoolsState, StudioLike} from './persistence'

export {EXTENSION_ID} from './constants'

export interface ThreejsDevtoolsConfig {
  renderer: WebGLRenderer
  camera: Camera
  studio: StudioLike
}

export interface ThreejsDevtools {
  extension: TheatreExtension
  getCamera(): Camera
  update(): void
  dispose(): void
}

type CameraMode = 'scene' | 'orbit'

export function buildExtension(config: ThreejsDevtoolsConfig): ThreejsDevtools {
  const {renderer, camera: sceneCamera, studio} = config

  let mode: CameraMode = 'scene'
  let setToolbar: ((config: ToolsetConfig) => void) | null = null
  let pendingOrbitEnabled: boolean | undefined
  let hasRemoteEditorUserToggledOrbit = false
  let modeBeforeRemoteEditor: CameraMode | undefined

  const width = renderer.domElement.clientWidth || window.innerWidth
  const height = renderer.domElement.clientHeight || window.innerHeight
  const initialFov =
    sceneCamera instanceof PerspectiveCamera ? sceneCamera.fov : 60

  const orbitCamera = new PerspectiveCamera(
    initialFov,
    width / height,
    0.1,
    1000,
  )
  orbitCamera.position.copy(sceneCamera.position)
  orbitCamera.quaternion.copy(sceneCamera.quaternion)

  const controls = new OrbitControls(orbitCamera, renderer.domElement)
  controls.enabled = false
  controls.target.set(0, 0, 0)

  const stateObj = createDevtoolsStateObject(
    studio,
    orbitCamera,
    controls,
    false,
  )

  const shouldPersistDevtoolsState = () => !isRemoteEditorWindow()

  const updateToolbarConfig = () => {
    if (!setToolbar) return
    setToolbar([
      {
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
      },
    ])
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

  const unsubscribeFromState = stateObj.onValuesChange((values) => {
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
  })

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
      persistOrbitEnabled(studio, stateObj, enabled)
    }
  }

  const updateTheatreCameraProps = () => {
    if (mode !== 'orbit' || !shouldPersistDevtoolsState()) return
    persistCameraProps(studio, stateObj, orbitCamera, controls)
  }

  const onResize = () => {
    const nextWidth = window.innerWidth
    const nextHeight = window.innerHeight
    orbitCamera.aspect = nextWidth / nextHeight
    orbitCamera.updateProjectionMatrix()
  }

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
      return mode === 'orbit' ? orbitCamera : sceneCamera
    },
    update() {
      if (mode === 'orbit') {
        controls.update()
      }
    },
    dispose() {
      unsubscribeFromState()
      unsubscribeFromRemoteEditor()
      window.removeEventListener('resize', onResize)
      controls.removeEventListener('end', updateTheatreCameraProps)
      controls.dispose()
    },
  }
}
