import {types} from '@unseenco/theatre-core'
import {OrthographicCamera, PerspectiveCamera} from 'three'
import type {Camera} from 'three'

type ProjectionCamera = PerspectiveCamera | OrthographicCamera

function isProjectionCamera(camera: Camera): camera is ProjectionCamera {
  return (
    camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera
  )
}

/** Full-frame vertical sensor height used for focal length ↔ FOV conversion. */
export const DEFAULT_SENSOR_HEIGHT_MM = 24

export function fovToFocalLength(
  fovDeg: number,
  sensorHeight = DEFAULT_SENSOR_HEIGHT_MM,
): number {
  const fovRad = (fovDeg * Math.PI) / 180
  return sensorHeight / (2 * Math.tan(fovRad / 2))
}

export function focalLengthToFov(
  focalLengthMm: number,
  sensorHeight = DEFAULT_SENSOR_HEIGHT_MM,
): number {
  return (2 * Math.atan(sensorHeight / (2 * focalLengthMm)) * 180) / Math.PI
}

export type CameraValues = {
  focalLength?: number
  near?: number
  far?: number
  zoom?: number
}

export type CameraConfig = {
  focalLength?: unknown
  near?: unknown
  far?: unknown
  zoom?: unknown
}

export type CameraApplier = (camera: Camera, values: CameraValues) => void

export type BuildCameraPropsOptions = {
  sensorHeight?: number
  exclude?: string[]
}

export function buildCameraProps(
  camera: Camera,
  options: BuildCameraPropsOptions = {},
): {
  config: CameraConfig
  applier: CameraApplier
} {
  const exclude = options.exclude ?? []
  const sensorHeight = options.sensorHeight ?? DEFAULT_SENSOR_HEIGHT_MM
  const projectionCamera = isProjectionCamera(camera) ? camera : null
  const trackFocalLength =
    projectionCamera instanceof PerspectiveCamera &&
    !exclude.includes('focalLength')
  const trackNear = projectionCamera !== null && !exclude.includes('near')
  const trackFar = projectionCamera !== null && !exclude.includes('far')
  const trackZoom = projectionCamera !== null && !exclude.includes('zoom')

  const config: CameraConfig = {}

  if (trackNear && projectionCamera) {
    config.near = types.number(projectionCamera.near, {
      range: [0.001, 1_000],
      nudgeMultiplier: 0.01,
      label: 'Near',
    })
  }

  if (trackFar && projectionCamera) {
    config.far = types.number(projectionCamera.far, {
      range: [1, 1_000_000],
      nudgeMultiplier: 1,
      label: 'Far',
    })
  }

  if (trackZoom && projectionCamera) {
    config.zoom = types.number(projectionCamera.zoom, {
      range: [0.01, 10],
      nudgeMultiplier: 0.01,
      label: 'Zoom',
    })
  }

  if (trackFocalLength && projectionCamera instanceof PerspectiveCamera) {
    config.focalLength = types.number(
      fovToFocalLength(projectionCamera.fov, sensorHeight),
      {
        range: [5, 500],
        nudgeMultiplier: 1,
        label: 'Focal length',
      },
    )
  }

  const applier: CameraApplier = (target, values) => {
    if (!isProjectionCamera(target)) return

    let projectionChanged = false

    if (trackNear && values.near !== undefined) {
      target.near = values.near
      projectionChanged = true
    }

    if (trackFar && values.far !== undefined) {
      target.far = values.far
      projectionChanged = true
    }

    if (trackZoom && values.zoom !== undefined) {
      target.zoom = values.zoom
      projectionChanged = true
    }

    if (
      trackFocalLength &&
      target instanceof PerspectiveCamera &&
      values.focalLength !== undefined
    ) {
      target.fov = focalLengthToFov(values.focalLength, sensorHeight)
      projectionChanged = true
    }

    if (projectionChanged) {
      target.updateProjectionMatrix()
    }
  }

  return {config, applier}
}
