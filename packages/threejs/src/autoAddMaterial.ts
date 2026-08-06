import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import type {Material} from 'three'
import {buildMaterialProps} from './buildMaterialProps'
import type {ExcludeInput} from './config'
import {resolveAutoAddObjectOptions} from './config'
import {getMaterialEntry, setMaterialEntry} from './materialRegistry'

export type AutoAddMaterialExcludeConfig = {
  material?: readonly string[]
  uniforms?: readonly string[]
}

/** A flat list applies to material props and uniforms. */
export type AutoAddMaterialExcludeInput =
  | readonly string[]
  | AutoAddMaterialExcludeConfig

export type AutoAddMaterialOptions = {
  objectKey?: string
  namespace?: string
  exclude?: AutoAddMaterialExcludeInput
  include?: AutoAddMaterialExcludeInput
  additionalConfig?: Record<string, unknown>
}

function toExcludeInput(
  input?: AutoAddMaterialExcludeInput,
): ExcludeInput | undefined {
  if (!input) return undefined
  if (Array.isArray(input)) return input
  return {
    material: input.material,
    uniforms: input.uniforms,
  }
}

function resolveMaterialName(
  material: Material | Material[],
): string | undefined {
  if (Array.isArray(material)) {
    const named = material.find((entry) => entry.name.trim())
    return named?.name.trim()
  }
  const name = material.name.trim()
  return name || undefined
}

function resolveObjectKey(
  material: Material | Material[],
  options: AutoAddMaterialOptions,
): string {
  const baseKey =
    options.objectKey ?? resolveMaterialName(material) ?? 'Material'
  return `${options.namespace ?? ''}${baseKey}`
}

/**
 * Register a Three.js material on a Theatre sheet with auto-parsed material
 * properties (colors, scalars, vectors, textures, shader uniforms).
 *
 * Use this instead of {@link autoAddObject} when you only want material props
 * and do not need transform binding or Object3D selection sync.
 */
export function autoAddMaterial(
  material: Material | Material[],
  sheet: ISheet,
  options: AutoAddMaterialOptions = {},
): ISheetObject {
  if (!material || (Array.isArray(material) && material.length === 0)) {
    throw new Error('autoAddMaterial() requires a Three.js Material.')
  }

  if (!sheet) {
    throw new Error('autoAddMaterial() requires a Theatre sheet.')
  }

  const existing = getMaterialEntry(material)
  if (existing?.mode === 'shared') {
    return existing.sheetObject
  }

  const objectKey = resolveObjectKey(material, options)
  const resolved = resolveAutoAddObjectOptions({
    exclude: toExcludeInput(options.exclude),
    include: toExcludeInput(options.include),
  })

  const {
    config: materialConfig,
    applier: applyMaterial,
    transientPaths,
  } = buildMaterialProps(material, {
    excludeMaterial: resolved.exclude.material,
    excludeUniforms: resolved.exclude.uniforms,
    includeMaterial: resolved.include.material,
    includeUniforms: resolved.include.uniforms,
    getAssetUrl: (asset) => sheet.project.getAssetUrl(asset),
  })

  if (!materialConfig || !applyMaterial) {
    throw new Error('autoAddMaterial() could not parse the given material.')
  }

  const config: Record<string, unknown> = {
    ...materialConfig,
    ...options.additionalConfig,
  }

  const sheetObject = sheet.object(
    objectKey,
    config as Parameters<ISheet['object']>[1],
    transientPaths.length > 0 ? {transient: transientPaths} : undefined,
  )

  sheetObject.onValuesChange((values) => {
    applyMaterial(material, values as Record<string, unknown>)
  })

  setMaterialEntry(material, {
    sheetObject,
    mode: 'shared',
  })

  return sheetObject
}
