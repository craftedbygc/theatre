/**
 * @packageDocumentation
 *
 * Three.js devtools for Theatre.js Studio.
 */

export {buildExtension} from './buildExtension'
export {autoAddObject} from './autoAddObject'
export {autoAddCamera} from './autoAddCamera'
export {
  configureTheatreThreejs,
  mergeExcludeInput,
  resetTheatreThreejsConfig,
} from './config'
export {parseUniformGui} from './parseUniformGui'
export {EXTENSION_ID} from './constants'

export type {AutoAddObjectOptions} from './autoAddObject'
export type {
  AutoAddCameraExcludeConfig,
  AutoAddCameraExcludeInput,
  AutoAddCameraOptions,
} from './autoAddCamera'

export type {
  AutoAddObjectDefaults,
  ExcludeConfig,
  ExcludeInput,
  TheatreThreejsConfig,
} from './config'

export type {
  ParsedUniformGuiOptions,
  UniformGuiOptions,
  UniformWithGui,
} from './parseUniformGui'

export type {
  OrbitModeSwitchCallback,
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
