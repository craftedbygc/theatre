import type {ISheetObject} from '@unseenco/theatre-core'
import type {Object3D} from 'three'
import type {
  StudioLike,
  StudioScrubLike,
  StudioTransactionAPI,
} from './persistence'

type TransformPropsPointer = {
  position?: {x: unknown; y: unknown; z: unknown}
  rotation?: {x: unknown; y: unknown; z: unknown}
  scale?: {x: unknown; y: unknown; z: unknown}
}

export function sheetObjectHasTransformProps(
  sheetObject: ISheetObject,
): boolean {
  const value = sheetObject.value as {transform?: TransformPropsPointer}
  const transform = value.transform
  if (!transform || typeof transform !== 'object') return false
  return Boolean(transform.position || transform.rotation || transform.scale)
}

function getTransformPropsPointer(
  sheetObject: ISheetObject,
): TransformPropsPointer | undefined {
  return (sheetObject.props as {transform?: TransformPropsPointer}).transform
}

function writeObjectTransform(
  api: StudioTransactionAPI,
  sheetObject: ISheetObject,
  object3d: Object3D,
): void {
  const transformProps = getTransformPropsPointer(sheetObject)
  const transformValue = (
    sheetObject.value as {transform?: TransformPropsPointer}
  ).transform
  if (!transformProps || !transformValue) return

  const {set} = api

  if (transformValue.position && transformProps.position) {
    set(transformProps.position.x, object3d.position.x)
    set(transformProps.position.y, object3d.position.y)
    set(transformProps.position.z, object3d.position.z)
  }
  if (transformValue.rotation && transformProps.rotation) {
    set(transformProps.rotation.x, object3d.rotation.x)
    set(transformProps.rotation.y, object3d.rotation.y)
    set(transformProps.rotation.z, object3d.rotation.z)
  }
  if (transformValue.scale && transformProps.scale) {
    set(transformProps.scale.x, object3d.scale.x)
    set(transformProps.scale.y, object3d.scale.y)
    set(transformProps.scale.z, object3d.scale.z)
  }
}

export type ObjectTransformScrub = {
  begin(): void
  capture(sheetObject: ISheetObject, object3d: Object3D): void
  end(commit: boolean): void
}

export function createObjectTransformScrub(
  studio: StudioLike,
): ObjectTransformScrub {
  let scrub: StudioScrubLike | null = null
  let hasCaptured = false

  const end = (commit: boolean) => {
    if (!scrub) return

    if (commit && hasCaptured) {
      scrub.commit()
    } else {
      scrub.discard()
    }

    scrub = null
    hasCaptured = false
  }

  return {
    begin() {
      end(false)
      scrub = studio.scrub()
      hasCaptured = false
    },
    capture(sheetObject, object3d) {
      if (!scrub) return

      const transformProps = getTransformPropsPointer(sheetObject)
      if (!transformProps) return

      scrub.capture((api) => {
        writeObjectTransform(api, sheetObject, object3d)
      })
      hasCaptured = true
    },
    end,
  }
}
