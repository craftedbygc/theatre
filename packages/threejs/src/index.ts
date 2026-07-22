/**
 * @packageDocumentation
 *
 * Three.js devtools for Theatre.js Studio.
 */

export {buildExtension} from './buildExtension'
export {EXTENSION_ID} from './constants'

export type {
  SceneConfig,
  SceneSwitchCallback,
  ThreejsDevtools,
  ThreejsDevtoolsConfig,
} from './buildExtension'

export type {DevtoolsState, StudioLike} from './persistence'

export type {
  TheatreExtension,
  ToolConfig,
  ToolConfigSwitch,
  ToolsetConfig,
} from './types'
