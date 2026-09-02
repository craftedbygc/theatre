import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import type {OnDiskState} from '@unseenco/theatre-core/projects/store/storeTypes'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {stripDefaultPropValuesFromMap} from '@unseenco/theatre-shared/propTypes/utils'
import type {SerializableMap} from '@unseenco/theatre-shared/utils/types'
import cloneDeep from 'lodash-es/cloneDeep'

export type ObjectPropConfigLookup = (
  sheetId: string,
  objectKey: ObjectAddressKey,
) => PropTypeConfig | undefined

const objectPropConfigRegistry = new Map<string, PropTypeConfig>()

function objectPropConfigRegistryKey(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
): string {
  return `${projectId}\0${sheetId}\0${objectKey}`
}

export function registerObjectPropConfig(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
  config: PropTypeConfig,
): void {
  objectPropConfigRegistry.set(
    objectPropConfigRegistryKey(projectId, sheetId, objectKey),
    config,
  )
}

export function unregisterObjectPropConfig(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
): void {
  objectPropConfigRegistry.delete(
    objectPropConfigRegistryKey(projectId, sheetId, objectKey),
  )
}

export function lookupObjectPropConfig(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
): PropTypeConfig | undefined {
  return objectPropConfigRegistry.get(
    objectPropConfigRegistryKey(projectId, sheetId, objectKey),
  )
}

export function createObjectPropConfigLookup(
  projectId: string,
): ObjectPropConfigLookup {
  return (sheetId, objectKey) =>
    lookupObjectPropConfig(projectId, sheetId, objectKey)
}

function stripDefaultsFromObjectStaticOverrides(
  staticOverrides: SerializableMap | undefined,
  config: PropTypeConfig,
): SerializableMap | undefined {
  if (!staticOverrides) return staticOverrides

  const stripped = stripDefaultPropValuesFromMap(staticOverrides, config)
  return Object.keys(stripped).length > 0 ? stripped : undefined
}

function stripDefaultsFromSheetStaticOverrides(
  byObject:
    | Partial<Record<ObjectAddressKey, SerializableMap | undefined>>
    | undefined,
  sheetId: string,
  getConfig: ObjectPropConfigLookup,
): void {
  if (!byObject) return

  for (const objectKey of Object.keys(byObject) as ObjectAddressKey[]) {
    const config = getConfig(sheetId, objectKey)
    if (!config) continue

    const stripped = stripDefaultsFromObjectStaticOverrides(
      byObject[objectKey],
      config,
    )

    if (stripped) {
      byObject[objectKey] = stripped
    } else {
      delete byObject[objectKey]
    }
  }
}

/**
 * Strips static override values that equal their prop defaults from an OnDiskState.
 */
export function stripDefaultPropValuesFromOnDiskState(
  state: OnDiskState,
  getConfig: ObjectPropConfigLookup,
): OnDiskState {
  const result = cloneDeep(state)

  for (const [sheetId, sheetState] of Object.entries(result.sheetsById)) {
    if (!sheetState) continue

    stripDefaultsFromSheetStaticOverrides(
      sheetState.staticOverrides?.byObject,
      sheetId,
      getConfig,
    )

    if (sheetState.staticOverridesByVariant) {
      for (const variantState of Object.values(
        sheetState.staticOverridesByVariant,
      )) {
        stripDefaultsFromSheetStaticOverrides(
          variantState?.byObject,
          sheetId,
          getConfig,
        )
      }
    }
  }

  return result
}
