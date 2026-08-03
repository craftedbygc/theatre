import type {Object3D} from 'three'

export type TransformValues = {
  visible: boolean
  transform: {
    position: {x: number; y: number; z: number}
    rotation: {x: number; y: number; z: number}
    scale: {x: number; y: number; z: number}
  }
}

export type TransformConfig = {
  visible?: unknown
  transform?: Record<string, unknown>
}

export type TransformApplier = (
  object: Object3D,
  values: TransformValues,
) => void

export type BuildTransformPropsOptions = {
  exclude?: string[]
}

export function buildTransformProps(
  object: Object3D,
  options: BuildTransformPropsOptions = {},
): {
  config: TransformConfig
  applier: TransformApplier
} {
  const exclude = options.exclude ?? []
  const trackPosition = !exclude.includes('position')
  const trackRotation = !exclude.includes('rotation')
  const trackScale = !exclude.includes('scale')
  const trackVisible = !exclude.includes('visible')

  const config: TransformConfig = {}

  if (trackVisible) {
    config.visible = object.visible
  }

  const transform: Record<string, unknown> = {}

  if (trackPosition) {
    transform.position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z,
    }
  }

  if (trackRotation) {
    transform.rotation = {
      x: object.rotation.x,
      y: object.rotation.y,
      z: object.rotation.z,
    }
  }

  if (trackScale) {
    transform.scale = {
      x: object.scale.x,
      y: object.scale.y,
      z: object.scale.z,
    }
  }

  if (Object.keys(transform).length > 0) {
    config.transform = transform
  }

  const applier: TransformApplier = (target, values) => {
    if (trackVisible && values.visible !== undefined) {
      target.visible = values.visible
    }

    if (trackPosition && values.transform?.position) {
      target.position.copy(values.transform.position)
    }

    if (trackRotation && values.transform?.rotation) {
      const {x, y, z} = values.transform.rotation
      target.rotation.set(x, y, z)
    }

    if (trackScale && values.transform?.scale) {
      target.scale.copy(values.transform.scale)
    }
  }

  return {config, applier}
}
