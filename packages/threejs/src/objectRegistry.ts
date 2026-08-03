import type {ISheetObject} from '@unseenco/theatre-core'
import type {Object3D} from 'three'
import {REGISTERED_OBJECT_FLAG} from './constants'

const objectToSheetObject = new WeakMap<Object3D, ISheetObject>()
const sheetObjectToObject = new WeakMap<ISheetObject, Object3D>()

export function registerObjectLink(
  object3d: Object3D,
  sheetObject: ISheetObject,
): void {
  objectToSheetObject.set(object3d, sheetObject)
  sheetObjectToObject.set(sheetObject, object3d)
  object3d.userData[REGISTERED_OBJECT_FLAG] = true
}

export function unregisterObjectLink(object3d: Object3D): void {
  const sheetObject = objectToSheetObject.get(object3d)
  if (sheetObject) {
    sheetObjectToObject.delete(sheetObject)
  }
  objectToSheetObject.delete(object3d)
  delete object3d.userData[REGISTERED_OBJECT_FLAG]
}

export function getSheetObjectForObject3D(
  object3d: Object3D,
): ISheetObject | undefined {
  return objectToSheetObject.get(object3d)
}

export function getObject3DForSheetObject(
  sheetObject: ISheetObject,
): Object3D | undefined {
  return sheetObjectToObject.get(sheetObject)
}

export function resolveRegisteredAncestor(
  object: Object3D,
): {object3d: Object3D; sheetObject: ISheetObject} | undefined {
  let current: Object3D | null = object
  while (current) {
    const sheetObject = objectToSheetObject.get(current)
    if (sheetObject) {
      return {object3d: current, sheetObject}
    }
    current = current.parent
  }
  return undefined
}

export function isRegisteredObject(object: Object3D): boolean {
  return object.userData[REGISTERED_OBJECT_FLAG] === true
}
