/**
 * @packageDocumentation
 *
 * Studio extension entry for `@unseenco/theatre-threejs`.
 * Depends on `@unseenco/theatre-studio`. Runtime helpers (`autoAddObject`, etc.)
 * live on the package root and do not pull in Studio.
 */

export {buildExtension} from './buildExtension'
export {EXTENSION_ID} from './constants'

export type {
  OrbitModeSwitchCallback,
  SceneConfig,
  SceneSwitchCallback,
  ThreejsDevtools,
  ThreejsDevtoolsConfig,
} from './buildExtension'

export type {DevtoolsState, StudioLike} from './persistence'
export type {ThreejsRenderer, WebGPURendererLike} from './types'

export type {
  TheatreExtension,
  ToolConfig,
  ToolConfigSwitch,
  ToolsetConfig,
} from './types'
