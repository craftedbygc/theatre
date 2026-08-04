import {BoxGeometry, Mesh, MeshBasicMaterial} from 'three'
import type {Camera} from 'three'
import {EXTENSION_ID} from './constants'

export const CAMERA_HITBOX_FLAG = `${EXTENSION_ID}:cameraHitbox`

const DEFAULT_HITBOX_SIZE = 1

export function attachCameraSelectionHitbox(
  camera: Camera,
  size = DEFAULT_HITBOX_SIZE,
): Mesh {
  const existing = camera.children.find(
    (child) => child.userData[CAMERA_HITBOX_FLAG] === true,
  )
  if (existing instanceof Mesh) {
    return existing
  }

  const hitbox = new Mesh(
    new BoxGeometry(size, size, size),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hitbox.name = 'Camera Selection Hitbox'
  hitbox.userData[CAMERA_HITBOX_FLAG] = true
  camera.add(hitbox)

  return hitbox
}
