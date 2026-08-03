import {types} from '@unseenco/theatre-core'
import type {Asset} from '@unseenco/theatre-shared/utils/assets'
import type {TransientPropPath} from '@unseenco/theatre-shared/utils/transientPropPaths'
import {
  AdditiveBlending,
  BackSide,
  Color,
  CustomBlending,
  DoubleSide,
  Euler,
  FrontSide,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  RawShaderMaterial,
  ShaderMaterial,
  SubtractiveBlending,
  Vector2,
  Vector3,
} from 'three'
import type {Blending, Side, Material} from 'three'
import {applyTheatreRgbaToColor, colorToTheatreRgba} from './colorUtils'
import {numberTypeOptionsFromUniformGui} from './parseUniformGui'
import type {UniformWithGui} from './parseUniformGui'
import {
  createTextureSlotApplier,
  isMaterialTextureProp,
  isTheatreImageAsset,
  isTexture,
  isUniformTextureProp,
  isUnsupportedUniformValue,
  MATERIAL_TEXTURE_PROPS,
  textureToDefaultAssetId,
} from './textureUtils'
import type {TextureSlotApplier} from './textureUtils'

const MATERIAL_NUMBER_PROPS = [
  'alphaTest',
  'aoMapIntensity',
  'attenuationDistance',
  'bumpScale',
  'clearcoat',
  'clearcoatRoughness',
  'displacementBias',
  'displacementScale',
  'emissiveIntensity',
  'envMapIntensity',
  'ior',
  'iridescence',
  'iridescenceIOR',
  'metalness',
  'opacity',
  'roughness',
  'sheen',
  'sheenRoughness',
  'specularIntensity',
  'thickness',
  'transmission',
] as const

const MATERIAL_COLOR_PROPS = [
  'attenuationColor',
  'color',
  'emissive',
  'sheenColor',
  'specularColor',
] as const

const MATERIAL_VECTOR2_PROPS = ['normalScale'] as const

const MATERIAL_VECTOR3_PROPS = ['envMapRotation'] as const

const SIDE_LABELS = {
  front: FrontSide,
  back: BackSide,
  double: DoubleSide,
} as const

const BLENDING_LABELS = {
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  CustomBlending,
} as const

type SideLabel = keyof typeof SIDE_LABELS
type BlendingLabel = keyof typeof BLENDING_LABELS

const SIDE_BY_VALUE = new Map<Side, SideLabel>(
  (Object.entries(SIDE_LABELS) as Array<[SideLabel, Side]>).map(
    ([label, value]) => [value, label],
  ),
)

const BLENDING_BY_VALUE = new Map<Blending, BlendingLabel>(
  (Object.entries(BLENDING_LABELS) as Array<[BlendingLabel, Blending]>).map(
    ([label, value]) => [value, label],
  ),
)

export type MaterialValues = Record<string, unknown>

export type MaterialApplier = (
  material: Material | Material[],
  values: MaterialValues,
) => void

export type BuildMaterialPropsOptions = {
  excludeMaterial?: string[]
  excludeUniforms?: string[]
  includeMaterial?: string[]
  includeUniforms?: string[]
  getAssetUrl?: (asset: Asset) => string | undefined
}

type MaterialConfig = Record<string, unknown>

type BuildSingleMaterialResult = {
  config: MaterialConfig
  transientPaths: TransientPropPath[]
}

function shouldTrackProp(
  key: string,
  exclude: string[],
  include: string[],
): boolean {
  if (exclude.includes(key)) return false
  if (include.length > 0 && !include.includes(key)) return false
  return true
}

function getMaterialFilterOptions(options: BuildMaterialPropsOptions = {}) {
  return {
    excludeMaterial: options.excludeMaterial ?? [],
    excludeUniforms: options.excludeUniforms ?? [],
    includeMaterial: options.includeMaterial ?? [],
    includeUniforms: options.includeUniforms ?? [],
    getAssetUrl: options.getAssetUrl,
  }
}

function buildTexturePropConfig(
  material: Material,
  key: string,
  exclude: string[],
  include: string[],
): unknown | undefined {
  if (!shouldTrackProp(key, exclude, include)) return undefined

  const value = (material as unknown as Record<string, unknown>)[key]
  if (!isMaterialTextureProp(material, key, value)) return undefined

  const defaultId =
    value && isTexture(value) ? textureToDefaultAssetId(value) : ''

  return types.image(defaultId, {label: key, persist: false})
}

function buildStandardMaterialOptions(
  material: Material,
  config: MaterialConfig,
): void {
  const sideLabel = SIDE_BY_VALUE.get(material.side) ?? 'front'
  config.side = types.stringLiteral(
    sideLabel,
    {
      front: 'front',
      back: 'back',
      double: 'double',
    },
    {as: 'menu'},
  )

  const blendingLabel =
    BLENDING_BY_VALUE.get(material.blending) ?? 'NormalBlending'
  config.blending = types.stringLiteral(
    blendingLabel,
    {
      NoBlending: 'NoBlending',
      NormalBlending: 'NormalBlending',
      AdditiveBlending: 'AdditiveBlending',
      SubtractiveBlending: 'SubtractiveBlending',
      MultiplyBlending: 'MultiplyBlending',
      CustomBlending: 'CustomBlending',
    },
    {as: 'menu'},
  )

  config.transparent = types.boolean(material.transparent)
  config.depthTest = types.boolean(material.depthTest)
  config.depthWrite = types.boolean(material.depthWrite)
  config.colorWrite = types.boolean(material.colorWrite)
  config.alphaTest = types.number(material.alphaTest, {
    range: [0, 1],
    nudgeMultiplier: 0.01,
  })

  if ('wireframe' in material) {
    config.wireframe = types.boolean(
      Boolean((material as Material & {wireframe?: boolean}).wireframe),
    )
  }
}

function applyStandardMaterialOptions(
  material: Material,
  values: Record<string, unknown>,
): void {
  const sideLabel = values.side as SideLabel | undefined
  if (sideLabel && sideLabel in SIDE_LABELS) {
    material.side = SIDE_LABELS[sideLabel]
  }

  const blendingLabel = values.blending as BlendingLabel | undefined
  if (blendingLabel && blendingLabel in BLENDING_LABELS) {
    material.blending = BLENDING_LABELS[blendingLabel]
  }

  if (typeof values.transparent === 'boolean') {
    material.transparent = values.transparent
  }
  if (typeof values.depthTest === 'boolean') {
    material.depthTest = values.depthTest
  }
  if (typeof values.depthWrite === 'boolean') {
    material.depthWrite = values.depthWrite
  }
  if (typeof values.colorWrite === 'boolean') {
    material.colorWrite = values.colorWrite
  }
  if (typeof values.alphaTest === 'number') {
    material.alphaTest = values.alphaTest
  }

  if ('wireframe' in material && typeof values.wireframe === 'boolean') {
    ;(material as Material & {wireframe?: boolean}).wireframe = values.wireframe
  }
}

function buildMaterialPropConfig(
  material: Material,
  key: string,
  exclude: string[],
  include: string[],
): unknown | undefined {
  if (!shouldTrackProp(key, exclude, include)) return undefined

  const value = (material as unknown as Record<string, unknown>)[key]
  if (value === undefined || value === null) return undefined
  if (isTexture(value)) return undefined

  if (value instanceof Color) {
    return types.rgba(colorToTheatreRgba(value), {label: key})
  }

  if (value instanceof Vector2) {
    return types.compound(
      {
        x: types.number(value.x, {nudgeMultiplier: 0.01}),
        y: types.number(value.y, {nudgeMultiplier: 0.01}),
      },
      {label: key},
    )
  }

  if (value instanceof Vector3 || value instanceof Euler) {
    return types.compound(
      {
        x: types.number(value.x, {nudgeMultiplier: 0.01}),
        y: types.number(value.y, {nudgeMultiplier: 0.01}),
        z: types.number(value.z, {nudgeMultiplier: 0.01}),
      },
      {label: key},
    )
  }

  if (typeof value === 'number') {
    const sanitized = value === Infinity ? 1000 : value
    return types.number(sanitized, {
      label: key,
      range: [0, Infinity],
      nudgeMultiplier: 0.01,
    })
  }

  if (typeof value === 'boolean') {
    return types.boolean(value, {label: key})
  }

  return undefined
}

function applyMaterialPropValue(
  material: Material,
  key: string,
  value: unknown,
  applyTexture: TextureSlotApplier | undefined,
): void {
  const current = (material as unknown as Record<string, unknown>)[key]

  if (
    isMaterialTextureProp(material, key, current) &&
    (isTheatreImageAsset(value) || value === undefined)
  ) {
    if (!applyTexture) return

    applyTexture(
      material,
      key,
      value ?? {type: 'image', id: undefined},
      () => {
        const slotValue = (material as unknown as Record<string, unknown>)[key]
        return isTexture(slotValue) ? slotValue : null
      },
      (texture) => {
        ;(material as unknown as Record<string, unknown>)[key] = texture
      },
      () => {
        material.needsUpdate = true
      },
    )
    return
  }

  if (current instanceof Color && value && typeof value === 'object') {
    applyTheatreRgbaToColor(
      current,
      value as {r: number; g: number; b: number; a: number},
    )
    return
  }

  if (current instanceof Vector2 && value && typeof value === 'object') {
    current.copy(value as Vector2)
    return
  }

  if (
    (current instanceof Vector3 || current instanceof Euler) &&
    value &&
    typeof value === 'object'
  ) {
    const next = value as {x: number; y: number; z: number}
    if (current instanceof Euler) {
      current.set(next.x, next.y, next.z)
    } else {
      current.copy(next)
    }
    return
  }

  if (typeof current === 'number' && typeof value === 'number') {
    ;(material as unknown as Record<string, unknown>)[key] = value
    return
  }

  if (typeof current === 'boolean' && typeof value === 'boolean') {
    ;(material as unknown as Record<string, unknown>)[key] = value
  }
}

function buildTrackedMaterialProps(
  material: Material,
  exclude: string[],
  include: string[],
  transientPaths: TransientPropPath[],
  materialPathPrefix: string,
): MaterialConfig {
  const config: MaterialConfig = {}

  if (
    !(material instanceof ShaderMaterial) &&
    !(material instanceof RawShaderMaterial)
  ) {
    for (const key of MATERIAL_NUMBER_PROPS) {
      const propConfig = buildMaterialPropConfig(
        material,
        key,
        exclude,
        include,
      )
      if (propConfig !== undefined) {
        config[key] = propConfig
      }
    }

    for (const key of MATERIAL_COLOR_PROPS) {
      const propConfig = buildMaterialPropConfig(
        material,
        key,
        exclude,
        include,
      )
      if (propConfig !== undefined) {
        config[key] = propConfig
      }
    }

    for (const key of MATERIAL_VECTOR2_PROPS) {
      const propConfig = buildMaterialPropConfig(
        material,
        key,
        exclude,
        include,
      )
      if (propConfig !== undefined) {
        config[key] = propConfig
      }
    }

    for (const key of MATERIAL_VECTOR3_PROPS) {
      const propConfig = buildMaterialPropConfig(
        material,
        key,
        exclude,
        include,
      )
      if (propConfig !== undefined) {
        config[key] = propConfig
      }
    }

    for (const key of MATERIAL_TEXTURE_PROPS) {
      const propConfig = buildTexturePropConfig(material, key, exclude, include)
      if (propConfig !== undefined) {
        config[key] = propConfig
        transientPaths.push(`${materialPathPrefix}.${key}`)
      }
    }
  }

  return config
}

function applyTrackedMaterialProps(
  material: Material,
  values: Record<string, unknown>,
  applyTexture: TextureSlotApplier | undefined,
): void {
  for (const key of Object.keys(values)) {
    if (
      key === 'side' ||
      key === 'blending' ||
      key === 'transparent' ||
      key === 'depthTest' ||
      key === 'depthWrite' ||
      key === 'colorWrite' ||
      key === 'alphaTest' ||
      key === 'wireframe' ||
      key === 'uniforms'
    ) {
      continue
    }

    applyMaterialPropValue(material, key, values[key], applyTexture)
  }
}

function buildUniformsConfig(
  uniforms: ShaderMaterial['uniforms'],
  exclude: string[],
  include: string[],
  transientPaths: TransientPropPath[],
  uniformsPathPrefix: string,
): Record<string, unknown> | undefined {
  const config: Record<string, unknown> = {}

  for (const key in uniforms) {
    if (!shouldTrackProp(key, exclude, include)) continue

    const uniform = uniforms[key] as UniformWithGui
    const value = uniform?.value

    if (isUniformTextureProp(key, value, uniform)) {
      const defaultId =
        value && isTexture(value) ? textureToDefaultAssetId(value) : ''
      config[key] = types.image(defaultId, {label: key, persist: false})
      transientPaths.push(`${uniformsPathPrefix}.${key}`)
      continue
    }

    if (isUnsupportedUniformValue(value)) continue

    if (value instanceof Color) {
      config[key] = types.rgba(colorToTheatreRgba(value), {label: key})
      continue
    }

    if (value instanceof Vector2) {
      config[key] = types.compound(
        {
          x: types.number(value.x, {
            label: 'x',
            ...numberTypeOptionsFromUniformGui(uniform, 'x'),
          }),
          y: types.number(value.y, {
            label: 'y',
            ...numberTypeOptionsFromUniformGui(uniform, 'y'),
          }),
        },
        {label: key},
      )
      continue
    }

    if (value instanceof Vector3) {
      config[key] = types.compound(
        {
          x: types.number(value.x, {
            label: 'x',
            ...numberTypeOptionsFromUniformGui(uniform, 'x'),
          }),
          y: types.number(value.y, {
            label: 'y',
            ...numberTypeOptionsFromUniformGui(uniform, 'y'),
          }),
          z: types.number(value.z, {
            label: 'z',
            ...numberTypeOptionsFromUniformGui(uniform, 'z'),
          }),
        },
        {label: key},
      )
      continue
    }

    if (typeof value === 'number') {
      config[key] = types.number(value, {
        label: key,
        ...numberTypeOptionsFromUniformGui(uniform),
      })
      continue
    }

    if (typeof value === 'boolean') {
      config[key] = types.boolean(value, {label: key})
    }
  }

  return Object.keys(config).length > 0 ? config : undefined
}

function applyUniforms(
  uniforms: ShaderMaterial['uniforms'],
  values: Record<string, unknown>,
  applyTexture: TextureSlotApplier | undefined,
): void {
  for (const key in values) {
    const uniform = uniforms[key]
    if (!uniform) continue

    const value = values[key]

    if (
      isUniformTextureProp(key, uniform.value, uniform as UniformWithGui) &&
      (isTheatreImageAsset(value) || value === undefined)
    ) {
      if (!applyTexture) continue

      applyTexture(
        uniforms,
        key,
        value ?? {type: 'image', id: undefined},
        () => {
          const slotValue = uniform.value
          return isTexture(slotValue) ? slotValue : null
        },
        (texture) => {
          uniform.value = texture
        },
      )
      continue
    }

    if (uniform.value instanceof Color && value && typeof value === 'object') {
      applyTheatreRgbaToColor(
        uniform.value,
        value as {r: number; g: number; b: number; a: number},
      )
      continue
    }

    if (
      uniform.value instanceof Vector2 &&
      value &&
      typeof value === 'object'
    ) {
      uniform.value.copy(value as Vector2)
      continue
    }

    if (
      uniform.value instanceof Vector3 &&
      value &&
      typeof value === 'object'
    ) {
      uniform.value.copy(value as Vector3)
      continue
    }

    if (typeof uniform.value === 'number' && typeof value === 'number') {
      uniform.value = value
      continue
    }

    if (typeof uniform.value === 'boolean' && typeof value === 'boolean') {
      uniform.value = value
    }
  }
}

function buildSingleMaterialConfig(
  material: Material,
  options: BuildMaterialPropsOptions,
  materialPathPrefix: string,
): BuildSingleMaterialResult {
  const {excludeMaterial, excludeUniforms, includeMaterial, includeUniforms} =
    getMaterialFilterOptions(options)

  const config: MaterialConfig = {}
  const transientPaths: TransientPropPath[] = []

  buildStandardMaterialOptions(material, config)
  Object.assign(
    config,
    buildTrackedMaterialProps(
      material,
      excludeMaterial,
      includeMaterial,
      transientPaths,
      materialPathPrefix,
    ),
  )

  if (
    material instanceof ShaderMaterial ||
    material instanceof RawShaderMaterial
  ) {
    const uniformsConfig = buildUniformsConfig(
      material.uniforms,
      excludeUniforms,
      includeUniforms,
      transientPaths,
      `${materialPathPrefix}.uniforms`,
    )
    if (uniformsConfig) {
      config.uniforms = uniformsConfig
    }
  }

  return {config, transientPaths}
}

function applySingleMaterialValues(
  material: Material,
  values: Record<string, unknown>,
  applyTexture: TextureSlotApplier | undefined,
): void {
  applyStandardMaterialOptions(material, values)
  applyTrackedMaterialProps(material, values, applyTexture)

  if (
    (material instanceof ShaderMaterial ||
      material instanceof RawShaderMaterial) &&
    values.uniforms &&
    typeof values.uniforms === 'object'
  ) {
    applyUniforms(
      material.uniforms,
      values.uniforms as Record<string, unknown>,
      applyTexture,
    )
  }
}

export function buildMaterialProps(
  material: Material | Material[] | undefined,
  options: BuildMaterialPropsOptions = {},
): {
  config: Record<string, unknown> | undefined
  applier: MaterialApplier | undefined
  transientPaths: TransientPropPath[]
} {
  if (!material) {
    return {config: undefined, applier: undefined, transientPaths: []}
  }

  const {getAssetUrl} = getMaterialFilterOptions(options)
  const applyTexture = getAssetUrl
    ? createTextureSlotApplier(getAssetUrl)
    : undefined

  if (Array.isArray(material)) {
    const entries: Record<string, MaterialConfig> = {}
    const transientPaths: TransientPropPath[] = []

    for (let index = 0; index < material.length; index++) {
      const materialPathPrefix = `material.${index}`
      const result = buildSingleMaterialConfig(
        material[index],
        options,
        materialPathPrefix,
      )
      entries[String(index)] = result.config
      transientPaths.push(...result.transientPaths)
    }

    return {
      config: {material: entries},
      transientPaths,
      applier: (target, values) => {
        const materials = Array.isArray(target) ? target : [target]
        const materialValues = values.material as
          | Record<string, Record<string, unknown>>
          | undefined
        if (!materialValues) return

        for (let index = 0; index < materials.length; index++) {
          const entryValues = materialValues[String(index)]
          if (entryValues) {
            applySingleMaterialValues(
              materials[index],
              entryValues,
              applyTexture,
            )
          }
        }
      },
    }
  }

  const materialPathPrefix = 'material'
  const {config: singleConfig, transientPaths} = buildSingleMaterialConfig(
    material,
    options,
    materialPathPrefix,
  )

  return {
    config: {material: singleConfig},
    transientPaths,
    applier: (target, values) => {
      const materials = Array.isArray(target) ? target[0] : target
      const materialValues = values.material as
        | Record<string, unknown>
        | undefined
      if (!materials || !materialValues) return
      applySingleMaterialValues(materials, materialValues, applyTexture)
    },
  }
}
