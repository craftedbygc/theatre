import {types} from '@unseenco/theatre-core'
import type {PerspectiveCamera} from 'three'
import type {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {DEVTOOLS_SHEET_ID} from './constants'

export type DevtoolsState = {
  orbitEnabled: boolean
  position: {x: number; y: number; z: number}
  target: {x: number; y: number; z: number}
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
      ): DevtoolsStateObject
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

export const DEVTOOLS_OBJECT_KEY = 'Devtools'

export function createDevtoolsStateObject(
  studio: StudioLike,
  orbitCamera: PerspectiveCamera,
  controls: OrbitControls,
  orbitEnabled: boolean,
): DevtoolsStateObject {
  const sheet = studio.getStudioProject().sheet(DEVTOOLS_SHEET_ID)
  return sheet.object(DEVTOOLS_OBJECT_KEY, {
    orbitEnabled: types.boolean(orbitEnabled),
    position: types.compound({
      x: orbitCamera.position.x,
      y: orbitCamera.position.y,
      z: orbitCamera.position.z,
    }),
    target: types.compound({
      x: controls.target.x,
      y: controls.target.y,
      z: controls.target.z,
    }),
  })
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
