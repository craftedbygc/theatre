/**
 * @packageDocumentation
 *
 * Runtime helpers for binding Three.js objects to Theatre.js sheets.
 * For Studio devtools (`buildExtension`), import from
 * `@unseenco/theatre-threejs/extension`.
 */

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
