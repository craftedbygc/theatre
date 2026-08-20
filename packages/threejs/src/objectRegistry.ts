import type {ISheetObject} from '@unseenco/theatre-core'
import type {Object3D} from 'three'
import {REGISTERED_OBJECT_FLAG} from './constants'

/**
 * Shared across the runtime and `/extension` bundles via `globalThis`.
 * Each entry is esbuild-bundled separately, so a module-level WeakMap would
 * otherwise be duplicated and selection sync would see an empty registry.
 */
const REGISTRY_KEY = '__unseenco_theatre_threejs_objectRegistry__'
const REGISTRY_LISTENERS_KEY =
  '__unseenco_theatre_threejs_objectRegistryListeners__'

type ObjectRegistryMaps = {
  objectToSheetObject: WeakMap<Object3D, ISheetObject>
  sheetObjectToObject: WeakMap<ISheetObject, Object3D>
}

type RegistryListener = () => void

function getMaps(): ObjectRegistryMaps {
  const store = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: ObjectRegistryMaps
  }
  let maps = store[REGISTRY_KEY]
  if (!maps) {
    maps = {
      objectToSheetObject: new WeakMap(),
      sheetObjectToObject: new WeakMap(),
    }
    store[REGISTRY_KEY] = maps
  }
  return maps
}

function getListeners(): Set<RegistryListener> {
  const store = globalThis as typeof globalThis & {
    [REGISTRY_LISTENERS_KEY]?: Set<RegistryListener>
  }
  let listeners = store[REGISTRY_LISTENERS_KEY]
  if (!listeners) {
    listeners = new Set()
    store[REGISTRY_LISTENERS_KEY] = listeners
  }
  return listeners
}

function notifyRegistryChange(): void {
  for (const listener of getListeners()) {
    listener()
  }
}

/**
 * Subscribe to object registry add/remove. Used by the Studio extension to
 * re-sync outline visibility when objects are auto-added after init.
 */
export function onObjectRegistryChange(listener: RegistryListener): () => void {
  const listeners = getListeners()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function registerObjectLink(
  object3d: Object3D,
  sheetObject: ISheetObject,
): void {
  const {objectToSheetObject, sheetObjectToObject} = getMaps()
  objectToSheetObject.set(object3d, sheetObject)
  sheetObjectToObject.set(sheetObject, object3d)
  object3d.userData[REGISTERED_OBJECT_FLAG] = true
  notifyRegistryChange()
}

export function unregisterObjectLink(object3d: Object3D): void {
  const {objectToSheetObject, sheetObjectToObject} = getMaps()
  const sheetObject = objectToSheetObject.get(object3d)
  if (sheetObject) {
    sheetObjectToObject.delete(sheetObject)
  }
  objectToSheetObject.delete(object3d)
  delete object3d.userData[REGISTERED_OBJECT_FLAG]
  notifyRegistryChange()
}

export function getSheetObjectForObject3D(
  object3d: Object3D,
): ISheetObject | undefined {
  return getMaps().objectToSheetObject.get(object3d)
}

export function getObject3DForSheetObject(
  sheetObject: ISheetObject,
): Object3D | undefined {
  return getMaps().sheetObjectToObject.get(sheetObject)
}

export function resolveRegisteredAncestor(
  object: Object3D,
): {object3d: Object3D; sheetObject: ISheetObject} | undefined {
  const {objectToSheetObject} = getMaps()
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
