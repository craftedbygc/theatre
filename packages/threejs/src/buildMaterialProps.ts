import {types} from '@unseenco/theatre-core'
import {
  AdditiveBlending,
  BackSide,
  Color,
  CustomBlending,
  DataTexture,
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
import type {Blending, Side, Texture, Material} from 'three'
import {applyTheatreRgbaToColor, colorToTheatreRgba} from './colorUtils'

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
}

type MaterialConfig = Record<string, unknown>

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
  }
}

function isTexture(value: unknown): value is Texture {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isTexture' in value &&
    (value as Texture).isTexture === true
  )
}

function isUnsupportedUniformValue(value: unknown): boolean {
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
): void {
  const current = (material as unknown as Record<string, unknown>)[key]

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
  }

  return config
}

function applyTrackedMaterialProps(
  material: Material,
  values: Record<string, unknown>,
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

    applyMaterialPropValue(material, key, values[key])
  }
}

function buildUniformsConfig(
  uniforms: ShaderMaterial['uniforms'],
  exclude: string[],
  include: string[],
): Record<string, unknown> | undefined {
  const config: Record<string, unknown> = {}

  for (const key in uniforms) {
    if (!shouldTrackProp(key, exclude, include)) continue

    const uniform = uniforms[key]
    const value = uniform?.value
    if (isUnsupportedUniformValue(value)) continue

    if (value instanceof Color) {
      config[key] = types.rgba(colorToTheatreRgba(value), {label: key})
      continue
    }

    if (value instanceof Vector2) {
      config[key] = types.compound(
        {
          x: types.number(value.x, {nudgeMultiplier: 0.01}),
          y: types.number(value.y, {nudgeMultiplier: 0.01}),
        },
        {label: key},
      )
      continue
    }

    if (value instanceof Vector3) {
      config[key] = types.compound(
        {
          x: types.number(value.x, {nudgeMultiplier: 0.01}),
          y: types.number(value.y, {nudgeMultiplier: 0.01}),
          z: types.number(value.z, {nudgeMultiplier: 0.01}),
        },
        {label: key},
      )
      continue
    }

    if (typeof value === 'number') {
      config[key] = types.number(value, {label: key, nudgeMultiplier: 0.01})
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
): void {
  for (const key in values) {
    const uniform = uniforms[key]
    if (!uniform) continue

    const value = values[key]
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
): MaterialConfig {
  const {excludeMaterial, excludeUniforms, includeMaterial, includeUniforms} =
    getMaterialFilterOptions(options)

  const config: MaterialConfig = {}
  buildStandardMaterialOptions(material, config)
  Object.assign(
    config,
    buildTrackedMaterialProps(material, excludeMaterial, includeMaterial),
  )

  if (
    material instanceof ShaderMaterial ||
    material instanceof RawShaderMaterial
  ) {
    const uniformsConfig = buildUniformsConfig(
      material.uniforms,
      excludeUniforms,
      includeUniforms,
    )
    if (uniformsConfig) {
      config.uniforms = uniformsConfig
    }
  }

  return config
}

function applySingleMaterialValues(
  material: Material,
  values: Record<string, unknown>,
): void {
  applyStandardMaterialOptions(material, values)
  applyTrackedMaterialProps(material, values)

  if (
    (material instanceof ShaderMaterial ||
      material instanceof RawShaderMaterial) &&
    values.uniforms &&
    typeof values.uniforms === 'object'
  ) {
    applyUniforms(material.uniforms, values.uniforms as Record<string, unknown>)
  }
}

export function buildMaterialProps(
  material: Material | Material[] | undefined,
  options: BuildMaterialPropsOptions = {},
): {
  config: Record<string, unknown> | undefined
  applier: MaterialApplier | undefined
} {
  if (!material) {
    return {config: undefined, applier: undefined}
  }

  if (Array.isArray(material)) {
    const entries: Record<string, MaterialConfig> = {}
    for (let index = 0; index < material.length; index++) {
      entries[String(index)] = buildSingleMaterialConfig(
        material[index],
        options,
      )
    }

    return {
      config: {material: entries},
      applier: (target, values) => {
        const materials = Array.isArray(target) ? target : [target]
        const materialValues = values.material as
          | Record<string, Record<string, unknown>>
          | undefined
        if (!materialValues) return

        for (let index = 0; index < materials.length; index++) {
          const entryValues = materialValues[String(index)]
          if (entryValues) {
            applySingleMaterialValues(materials[index], entryValues)
          }
        }
      },
    }
  }

  const singleConfig = buildSingleMaterialConfig(material, options)

  return {
    config: {material: singleConfig},
    applier: (target, values) => {
      const materials = Array.isArray(target) ? target[0] : target
      const materialValues = values.material as
        | Record<string, unknown>
        | undefined
      if (!materials || !materialValues) return
      applySingleMaterialValues(materials, materialValues)
    },
  }
}
