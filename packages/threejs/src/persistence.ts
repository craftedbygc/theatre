import {types} from '@unseenco/theatre-core'
import type {PerspectiveCamera} from 'three'
import type {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {DEVTOOLS_SHEET_ID} from './constants'

export type DevtoolsState = {
  orbitEnabled: boolean
  position: {x: number; y: number; z: number}
  target: {x: number; y: number; z: number}
}

export type ActiveSceneState = {
  activeSceneName: string
}

export interface StudioTransactionAPI {
  set(pointer: unknown, value: unknown): void
}

export interface StudioLike {
  getStudioProject(): {
    sheet(sheetId: string): {
      object(
        objectKey: string,
        props: Record<string, unknown>,
      ): DevtoolsStateObject & ActiveSceneStateObject
    }
  }
  transaction(
    fn: (api: StudioTransactionAPI) => void,
    opts?: {undoable?: boolean},
  ): void
}

export interface DevtoolsStateObject {
  readonly props: {
    orbitEnabled: unknown
    position: {
      x: unknown
      y: unknown
      z: unknown
    }
    target: {
      x: unknown
      y: unknown
      z: unknown
    }
  }
  onValuesChange(fn: (values: DevtoolsState) => void): () => void
}

export interface ActiveSceneStateObject {
  readonly props: {
    activeSceneName: unknown
  }
  onValuesChange(fn: (values: ActiveSceneState) => void): () => void
}

export const ACTIVE_SCENE_OBJECT_KEY = 'Devtools: ActiveScene'

export function getDevtoolsObjectKey(sceneName: string): string {
  return `Devtools: ${sceneName}`
}

export function createDevtoolsStateObject(
  studio: StudioLike,
  objectKey: string,
  initialState: DevtoolsState,
): DevtoolsStateObject {
  const sheet = studio.getStudioProject().sheet(DEVTOOLS_SHEET_ID)
  return sheet.object(objectKey, {
    orbitEnabled: types.boolean(initialState.orbitEnabled),
    position: types.compound({
      x: initialState.position.x,
      y: initialState.position.y,
      z: initialState.position.z,
    }),
    target: types.compound({
      x: initialState.target.x,
      y: initialState.target.y,
      z: initialState.target.z,
    }),
  })
}

export function createInitialDevtoolsStateFromCamera(camera: {
  position: {x: number; y: number; z: number}
}): DevtoolsState {
  return {
    orbitEnabled: false,
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    target: {x: 0, y: 0, z: 0},
  }
}

export function createActiveSceneStateObject(
  studio: StudioLike,
  initialSceneName: string,
): ActiveSceneStateObject {
  const sheet = studio.getStudioProject().sheet(DEVTOOLS_SHEET_ID)
  return sheet.object(ACTIVE_SCENE_OBJECT_KEY, {
    activeSceneName: types.string(initialSceneName),
  })
}

export function persistActiveSceneName(
  studio: StudioLike,
  stateObj: ActiveSceneStateObject,
  sceneName: string,
): void {
  studio.transaction(
    ({set}) => {
      set(stateObj.props.activeSceneName, sceneName)
    },
    {undoable: false},
  )
}

export function persistCameraProps(
  studio: StudioLike,
  stateObj: DevtoolsStateObject,
  orbitCamera: PerspectiveCamera,
  controls: OrbitControls,
): void {
  studio.transaction(
    ({set}) => {
      set(stateObj.props.position.x, orbitCamera.position.x)
      set(stateObj.props.position.y, orbitCamera.position.y)
      set(stateObj.props.position.z, orbitCamera.position.z)
      set(stateObj.props.target.x, controls.target.x)
      set(stateObj.props.target.y, controls.target.y)
      set(stateObj.props.target.z, controls.target.z)
    },
    {undoable: false},
  )
}

export function persistOrbitEnabled(
  studio: StudioLike,
  stateObj: DevtoolsStateObject,
  orbitEnabled: boolean,
): void {
  studio.transaction(
    ({set}) => {
      set(stateObj.props.orbitEnabled, orbitEnabled)
    },
    {undoable: false},
  )
}
