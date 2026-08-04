import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import type {Camera, Scene} from 'three'
import {buildCameraProps} from './buildCameraProps'
import {attachCameraSelectionHitbox} from './cameraHitbox'
import {buildTransformProps} from './buildTransformProps'
import {registerObjectLink} from './objectRegistry'

export type AutoAddCameraExcludeConfig = {
  transform?: readonly string[]
  camera?: readonly string[]
}

export type AutoAddCameraExcludeInput =
  | readonly string[]
  | AutoAddCameraExcludeConfig

export type AutoAddCameraOptions = {
  objectKey?: string
  namespace?: string
  exclude?: AutoAddCameraExcludeInput
  additionalConfig?: Record<string, unknown>
  /**
   * When set, the camera is added to this scene if it isn't already part of a
   * scene graph. Required for transform controls in orbit mode.
   */
  scene?: Scene
  /** Sensor height in mm for focal length ↔ FOV conversion. Default: 24. */
  sensorHeight?: number
}

const CAMERA_PROP_KEYS = new Set(['focalLength', 'near', 'far', 'zoom'])

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}

function resolveAutoAddCameraExcludes(exclude?: AutoAddCameraExcludeInput): {
  transform: string[]
  camera: string[]
} {
  const transform = ['scale']
  const camera: string[] = []

  if (!exclude) {
    return {transform, camera}
  }

  if (Array.isArray(exclude)) {
    for (const key of exclude) {
      if (CAMERA_PROP_KEYS.has(key)) {
        camera.push(key)
      } else {
        transform.push(key)
      }
    }
    return {transform: dedupe(transform), camera: dedupe(camera)}
  }

  const excludeConfig = exclude as AutoAddCameraExcludeConfig

  return {
    transform: dedupe(['scale', ...(excludeConfig.transform ?? [])]),
    camera: dedupe([...(excludeConfig.camera ?? [])]),
  }
}

function resolveObjectKey(
  camera: Camera,
  options: AutoAddCameraOptions,
): string {
  const baseKey = options.objectKey ?? (camera.name.trim() || 'Camera')
  return `${options.namespace ?? ''}${baseKey}`
}

function ensureCameraInScene(camera: Camera, scene?: Scene): void {
  if (!scene || camera.parent) return
  scene.add(camera)
}

export function autoAddCamera(
  camera: Camera,
  sheet: ISheet,
  options: AutoAddCameraOptions = {},
): ISheetObject {
  if (!camera) {
    throw new Error('autoAddCamera() requires a Three.js Camera.')
  }

  if (!sheet) {
    throw new Error('autoAddCamera() requires a Theatre sheet.')
  }

  ensureCameraInScene(camera, options.scene)
  attachCameraSelectionHitbox(camera)

  const objectKey = resolveObjectKey(camera, options)
  const resolvedExclude = resolveAutoAddCameraExcludes(options.exclude)

  const {config: transformConfig, applier: applyTransform} =
    buildTransformProps(camera, {exclude: resolvedExclude.transform})

  const {config: cameraConfig, applier: applyCamera} = buildCameraProps(
    camera,
    {
      sensorHeight: options.sensorHeight,
      exclude: resolvedExclude.camera,
    },
  )

  const config: Record<string, unknown> = {
    ...transformConfig,
    ...cameraConfig,
    ...options.additionalConfig,
  }

  const sheetObject = sheet.object(
    objectKey,
    config as Parameters<ISheet['object']>[1],
  )

  sheetObject.onValuesChange((values) => {
    applyTransform(camera, values as Parameters<typeof applyTransform>[1])
    applyCamera(camera, values as Parameters<typeof applyCamera>[1])
  })

  registerObjectLink(camera, sheetObject)

  return sheetObject
}
