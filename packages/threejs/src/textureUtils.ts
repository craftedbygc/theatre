import type {Asset} from '@unseenco/theatre-shared/utils/assets'
import {DataTexture, RepeatWrapping, TextureLoader} from 'three'
import type {Material, Texture} from 'three'
import type {UniformWithGui} from './parseUniformGui'
import {uniformGuiDeclaresTexture} from './parseUniformGui'

export const MATERIAL_TEXTURE_PROPS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'normalMap',
  'displacementMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'matcap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'iridescenceMap',
  'iridescenceThicknessMap',
  'transmissionMap',
  'thicknessMap',
  'specularColorMap',
  'specularIntensityMap',
  'anisotropyMap',
] as const

const MATERIAL_TEXTURE_PROP_SET = new Set<string>(MATERIAL_TEXTURE_PROPS)

const UNIFORM_TEXTURE_KEY_PATTERN = /(Map|Texture|map|texture)$/
const UNIFORM_TEXTURE_T_PREFIX_PATTERN = /^t[A-Z]/

export function isTexture(value: unknown): value is Texture {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isTexture' in value &&
    (value as Texture).isTexture === true
  )
}

export function isTheatreImageAsset(value: unknown): value is Asset {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as Asset).type === 'image'
  )
}

export function isMaterialTextureProp(
  material: Material,
  key: string,
  value: unknown,
): boolean {
  if (isTexture(value)) return true
  if (value !== null) return false
  return MATERIAL_TEXTURE_PROP_SET.has(key) && key in material
}

export function isUniformTextureProp(
  key: string,
  value: unknown,
  uniform?: UniformWithGui,
): boolean {
  if (uniform && uniformGuiDeclaresTexture(uniform)) return true
  if (isTexture(value)) return true
  if (value !== null && value !== undefined) return false
  return (
    UNIFORM_TEXTURE_KEY_PATTERN.test(key) ||
    UNIFORM_TEXTURE_T_PREFIX_PATTERN.test(key)
  )
}

/**
 * Default Theatre image asset id for an existing Three.js texture.
 * Uses the image's original URL so Studio can preview it directly (via
 * `getAssetUrl` passthrough for direct URLs) instead of a bare basename
 * that 404s under the project's asset `baseUrl`.
 */
export function textureToDefaultAssetId(texture: Texture): string {
  const image = texture.image as {src?: string} | undefined
  return image?.src ?? ''
}

export function copyTextureSettings(from: Texture, to: Texture): void {
  to.wrapS = from.wrapS
  to.wrapT = from.wrapT
  if ('wrapR' in from && 'wrapR' in to) {
    ;(to as Texture & {wrapR?: number}).wrapR = (
      from as Texture & {wrapR?: number}
    ).wrapR
  }
  to.repeat.copy(from.repeat)
  to.offset.copy(from.offset)
  to.center.copy(from.center)
  to.rotation = from.rotation
  to.matrix.copy(from.matrix)
  to.flipY = from.flipY
  to.colorSpace = from.colorSpace
  to.minFilter = from.minFilter
  to.magFilter = from.magFilter
  to.anisotropy = from.anisotropy
  to.generateMipmaps = from.generateMipmaps
  to.premultiplyAlpha = from.premultiplyAlpha
  to.unpackAlignment = from.unpackAlignment
}

type TextureSlotOwner = object

type SlotState = {
  generation: number
  theatreTexture: Texture | null
  appliedAssetId: string | undefined
}

const slotStates = new WeakMap<TextureSlotOwner, Map<string, SlotState>>()

function getSlotState(owner: TextureSlotOwner, key: string): SlotState {
  let slots = slotStates.get(owner)
  if (!slots) {
    slots = new Map()
    slotStates.set(owner, slots)
  }

  let state = slots.get(key)
  if (!state) {
    state = {generation: 0, theatreTexture: null, appliedAssetId: undefined}
    slots.set(key, state)
  }

  return state
}

function getImageAssetId(asset: unknown): string {
  if (!isTheatreImageAsset(asset)) return ''
  return asset.id ?? ''
}

function disposeTheatreTexture(state: SlotState): void {
  if (state.theatreTexture) {
    state.theatreTexture.dispose()
    state.theatreTexture = null
  }
}

export type TextureSlotApplier = (
  owner: TextureSlotOwner,
  key: string,
  asset: unknown,
  getCurrentTexture: () => Texture | null,
  setTexture: (texture: Texture | null) => void,
  onAssigned?: () => void,
) => void

export function createTextureSlotApplier(
  getAssetUrl: (asset: Asset) => string | undefined,
): TextureSlotApplier {
  const loader = new TextureLoader()

  return (owner, key, asset, getCurrentTexture, setTexture, onAssigned) => {
    const state = getSlotState(owner, key)
    const assetId = getImageAssetId(asset)

    // Skip when the image id is unchanged — onValuesChange fires for every
    // prop edit, and reloading an unchanged texture causes needless fetches.
    if (state.appliedAssetId === assetId) {
      return
    }

    if (!assetId) {
      // Empty asset on first sync means Theatre has no image for this slot.
      // Preserve any existing (e.g. procedural DataTexture) map — only clear
      // when the user previously assigned a Theatre image and then removed it.
      const previouslyHadTheatreAsset =
        state.appliedAssetId !== undefined && state.appliedAssetId !== ''

      state.generation += 1
      disposeTheatreTexture(state)
      state.appliedAssetId = ''

      if (previouslyHadTheatreAsset) {
        setTexture(null)
        onAssigned?.()
      }
      return
    }

    // First sync: Theatre echoes the default asset id derived from an
    // already-present texture. Keep that texture — do not reload.
    if (state.appliedAssetId === undefined) {
      const existingTexture = getCurrentTexture()
      if (existingTexture && isTexture(existingTexture)) {
        state.appliedAssetId = assetId
        return
      }
    }

    const url = getAssetUrl(asset as Asset)
    if (!url) {
      // Remember the id so a missing asset is not retried on every edit.
      state.appliedAssetId = assetId
      return
    }

    state.generation += 1
    const generation = state.generation
    // Mark before the async load so concurrent same-id callbacks are no-ops,
    // including when the load later 404s.
    state.appliedAssetId = assetId

    loader.load(
      url,
      (loadedTexture) => {
        if (state.generation !== generation) {
          loadedTexture.dispose()
          return
        }

        const existingTexture = getCurrentTexture()
        if (existingTexture && isTexture(existingTexture)) {
          copyTextureSettings(existingTexture, loadedTexture)
        }

        disposeTheatreTexture(state)
        state.theatreTexture = loadedTexture
        setTexture(loadedTexture)
        onAssigned?.()
      },
      undefined,
      () => {
        if (state.generation !== generation) {
          return
        }
      },
    )
  }
}

export function isUnsupportedUniformValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return true
  if (isTexture(value)) return true
  if (value instanceof DataTexture) return true
  if (
    typeof value === 'object' &&
    value !== null &&
    ('isMatrix4' in value ||
      'isMatrix3' in value ||
      'isRenderTargetTexture' in value ||
      'isDepthTexture' in value)
  ) {
    return true
  }
  return false
}

/** @internal exported for tests */
export function __testOnly_setTextureRepeatWrapping(texture: Texture): void {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
}
