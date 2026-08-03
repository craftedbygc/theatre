import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import type {Material, Mesh, Object3D} from 'three'
import {buildMaterialProps} from './buildMaterialProps'
import {buildTransformProps} from './buildTransformProps'
import {registerObjectLink} from './objectRegistry'

export type AutoAddObjectOptions = {
  objectKey?: string
  namespace?: string
  exclude?: string[]
  include?: string[]
  additionalConfig?: Record<string, unknown>
  trackMaterial?: boolean
}

function getMeshMaterial(object: Object3D): Material | Material[] | undefined {
  if ('material' in object) {
    return (object as Mesh).material
  }
  return undefined
}

function resolveObjectKey(
  object: Object3D,
  options: AutoAddObjectOptions,
): string {
  const baseKey = options.objectKey ?? (object.name.trim() || 'Object')
  return `${options.namespace ?? ''}${baseKey}`
}

export function autoAddObject<T extends Object3D>(
  object: T,
  sheet: ISheet,
  options: AutoAddObjectOptions = {},
): ISheetObject {
  if (!object) {
    throw new Error('autoAddObject() requires a Three.js Object3D.')
  }

  if (!sheet) {
    throw new Error('autoAddObject() requires a Theatre sheet.')
  }

  const objectKey = resolveObjectKey(object, options)
  const exclude = options.exclude ?? []
  const include = options.include ?? []
  const trackMaterial =
    options.trackMaterial ?? getMeshMaterial(object) !== undefined

  const {config: transformConfig, applier: applyTransform} =
    buildTransformProps(object, {exclude})

  const config: Record<string, unknown> = {
    ...transformConfig,
    ...options.additionalConfig,
  }

  let applyMaterial: ReturnType<typeof buildMaterialProps>['applier']

  if (trackMaterial) {
    const material = getMeshMaterial(object)
    const {config: materialConfig, applier} = buildMaterialProps(material, {
      exclude,
      include,
    })
    if (materialConfig) {
      Object.assign(config, materialConfig)
    }
    applyMaterial = applier
  }

  const sheetObject = sheet.object(
    objectKey,
    config as Parameters<ISheet['object']>[1],
  )

  sheetObject.onValuesChange((values) => {
    applyTransform(object, values as Parameters<typeof applyTransform>[1])

    if (applyMaterial) {
      const material = getMeshMaterial(object)
      if (material) {
        applyMaterial(material, values as Record<string, unknown>)
      }
    }
  })

  registerObjectLink(object, sheetObject)

  return sheetObject
}
