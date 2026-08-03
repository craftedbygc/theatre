import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import type {OnDiskState} from '@unseenco/theatre-core/projects/store/storeTypes'
import type {
  HistoricPositionalSequence,
  SheetState_Historic,
} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {
  PathToProp,
  PathToProp_Encoded,
} from '@unseenco/theatre-shared/utils/addresses'
import {encodePathToProp} from '@unseenco/theatre-shared/utils/addresses'
import {getPropConfigByPath} from '@unseenco/theatre-shared/propTypes/utils'
import removePathFromObject from '@unseenco/theatre-shared/utils/removePathFromObject'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import type {SerializableMap} from '@unseenco/theatre-shared/utils/types'
import {cloneDeep} from 'lodash-es'

export type TransientPropPath = string | readonly (string | number)[]

/** Same path format as {@link TransientPropPath}. */
export type StaticPropPath = TransientPropPath

/**
 * Parses a sheet-object prop path from either dot-notation string or PathToProp array.
 */
export function parseTransientPropPath(input: TransientPropPath): PathToProp {
  if (typeof input === 'string') {
    if (input.length === 0) {
      throw new Error(
        `Transient prop path cannot be an empty string. Use a dot-separated path like "foo.bar".`,
      )
    }
    return input.split('.')
  }
  return [...input]
}

/**
 * Returns true if `path` equals or is a descendant of any prefix in `prefixes`.
 */
export function isPathUnderTransientPrefix(
  path: PathToProp,
  prefixes: ReadonlySet<PathToProp_Encoded>,
): boolean {
  for (let i = 1; i <= path.length; i++) {
    const prefix = path.slice(0, i)
    if (prefixes.has(encodePathToProp(prefix))) {
      return true
    }
  }
  return false
}

/**
 * Normalizes prop paths for a sheet.object() option, validates against config.
 */
function normalizePropPaths(
  paths: readonly TransientPropPath[] | undefined,
  config: PropTypeConfig,
  objectKeyForError: string,
  optionName: 'transient' | 'static',
): ReadonlySet<PathToProp_Encoded> {
  if (!paths || paths.length === 0) {
    return new Set()
  }

  const result = new Set<PathToProp_Encoded>()

  for (const rawPath of paths) {
    const pathToProp = parseTransientPropPath(rawPath)

    if (process.env.NODE_ENV !== 'production') {
      const propConfig = getPropConfigByPath(config, pathToProp)
      if (!propConfig) {
        throw new Error(
          `sheet.object("${objectKeyForError}", ..., { ${optionName}: [...] }): ` +
            `path ${JSON.stringify(
              rawPath,
            )} does not match any prop in the object's config.`,
        )
      }
    }

    result.add(encodePathToProp(pathToProp))
  }

  return result
}

/**
 * Normalizes transient prop paths, validates them against the object config,
 * and returns an encoded set for fast lookup.
 */
export function normalizeTransientPropPaths(
  paths: readonly TransientPropPath[] | undefined,
  config: PropTypeConfig,
  objectKeyForError: string,
): ReadonlySet<PathToProp_Encoded> {
  return normalizePropPaths(paths, config, objectKeyForError, 'transient')
}

/**
 * Normalizes static prop paths, validates them against the object config,
 * and returns an encoded set for fast lookup.
 */
export function normalizeStaticPropPaths(
  paths: readonly StaticPropPath[] | undefined,
  config: PropTypeConfig,
  objectKeyForError: string,
): ReadonlySet<PathToProp_Encoded> {
  return normalizePropPaths(paths, config, objectKeyForError, 'static')
}

/**
 * Removes all values at paths under any of the given transient prefixes.
 */
export function stripTransientPathsFromSerializableMap(
  map: SerializableMap,
  prefixes: ReadonlySet<PathToProp_Encoded>,
): SerializableMap {
  if (prefixes.size === 0) {
    return map
  }

  const result = cloneDeep(map)

  for (const encodedPrefix of prefixes) {
    const path = JSON.parse(encodedPrefix as string) as PathToProp
    removePathFromObject(result, path)
  }

  return result
}

function stripTransientPathsFromSequenceTracks(
  sequence: HistoricPositionalSequence | undefined,
  objectKey: ObjectAddressKey,
  prefixes: ReadonlySet<PathToProp_Encoded>,
) {
  if (!sequence || prefixes.size === 0) return

  const objectTracks = sequence.tracksByObject?.[objectKey]
  if (!objectTracks) return

  for (const [encodedPath, trackId] of Object.entries(
    objectTracks.trackIdByPropPath,
  )) {
    if (typeof trackId !== 'string') continue
    const path = JSON.parse(encodedPath) as PathToProp
    if (isPathUnderTransientPrefix(path, prefixes)) {
      delete objectTracks.trackIdByPropPath[encodedPath as PathToProp_Encoded]
      delete objectTracks.trackData[trackId]
    }
  }

  if (objectTracks.unsequencedPropPaths) {
    objectTracks.unsequencedPropPaths =
      objectTracks.unsequencedPropPaths.filter(
        (encodedPath) =>
          !isPathUnderTransientPrefix(
            JSON.parse(encodedPath) as PathToProp,
            prefixes,
          ),
      )
  }
}

/**
 * Removes sequence track data for paths under the given prefixes.
 * Does not modify static overrides.
 */
export function stripSequenceTracksForPathsFromObjectInSheetState(
  sheetState: SheetState_Historic,
  objectKey: ObjectAddressKey,
  prefixes: ReadonlySet<PathToProp_Encoded>,
): void {
  if (prefixes.size === 0) return

  stripTransientPathsFromSequenceTracks(
    sheetState.sequence,
    objectKey,
    prefixes,
  )

  if (sheetState.sequencesById) {
    for (const sequence of Object.values(sheetState.sequencesById)) {
      stripTransientPathsFromSequenceTracks(sequence, objectKey, prefixes)
    }
  }
}

/**
 * Removes transient prop data from historic state for a single object.
 * Mutates `sheetState` in place.
 */
export function stripTransientPropsFromObjectInSheetState(
  sheetState: SheetState_Historic,
  objectKey: ObjectAddressKey,
  prefixes: ReadonlySet<PathToProp_Encoded>,
): void {
  if (prefixes.size === 0) return

  const staticOverrides = sheetState.staticOverrides.byObject[objectKey]
  if (staticOverrides) {
    sheetState.staticOverrides.byObject[objectKey] =
      stripTransientPathsFromSerializableMap(staticOverrides, prefixes)
  }

  if (sheetState.staticOverridesByVariant) {
    for (const variantOverrides of Object.values(
      sheetState.staticOverridesByVariant,
    )) {
      const objOverrides = variantOverrides?.byObject[objectKey]
      if (objOverrides) {
        variantOverrides!.byObject[objectKey] =
          stripTransientPathsFromSerializableMap(objOverrides, prefixes)
      }
    }
  }

  stripTransientPathsFromSequenceTracks(
    sheetState.sequence,
    objectKey,
    prefixes,
  )

  if (sheetState.sequencesById) {
    for (const sequence of Object.values(sheetState.sequencesById)) {
      stripTransientPathsFromSequenceTracks(sequence, objectKey, prefixes)
    }
  }
}

export type TransientPropPathsLookup = (
  sheetId: string,
  objectKey: ObjectAddressKey,
) => ReadonlySet<PathToProp_Encoded> | undefined

const transientPropPathsRegistry = new Map<
  string,
  ReadonlySet<PathToProp_Encoded>
>()

function transientPropPathsRegistryKey(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
): string {
  return `${projectId}\0${sheetId}\0${objectKey}`
}

export function registerObjectTransientPropPaths(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
  paths: ReadonlySet<PathToProp_Encoded>,
): void {
  const key = transientPropPathsRegistryKey(projectId, sheetId, objectKey)
  if (paths.size === 0) {
    transientPropPathsRegistry.delete(key)
  } else {
    transientPropPathsRegistry.set(key, paths)
  }
}

export function lookupObjectTransientPropPaths(
  projectId: string,
  sheetId: string,
  objectKey: ObjectAddressKey,
): ReadonlySet<PathToProp_Encoded> | undefined {
  return transientPropPathsRegistry.get(
    transientPropPathsRegistryKey(projectId, sheetId, objectKey),
  )
}

export function createTransientPropPathsLookup(
  projectId: string,
): TransientPropPathsLookup {
  return (sheetId, objectKey) =>
    lookupObjectTransientPropPaths(projectId, sheetId, objectKey)
}

/**
 * Strips all transient prop data from an OnDiskState.
 */
export function stripTransientPropsFromOnDiskState(
  state: OnDiskState,
  getTransientPaths: TransientPropPathsLookup,
): OnDiskState {
  const result = cloneDeep(state)

  for (const [sheetId, sheetState] of Object.entries(result.sheetsById)) {
    if (!sheetState) continue

    const objectKeys = new Set<ObjectAddressKey>()

    for (const key of Object.keys(sheetState.staticOverrides.byObject)) {
      objectKeys.add(key as ObjectAddressKey)
    }

    if (sheetState.sequence?.tracksByObject) {
      for (const key of Object.keys(sheetState.sequence.tracksByObject)) {
        objectKeys.add(key as ObjectAddressKey)
      }
    }

    if (sheetState.sequencesById) {
      for (const sequence of Object.values(sheetState.sequencesById)) {
        if (!sequence?.tracksByObject) continue
        for (const key of Object.keys(sequence.tracksByObject)) {
          objectKeys.add(key as ObjectAddressKey)
        }
      }
    }

    for (const objectKey of objectKeys) {
      const prefixes = getTransientPaths(sheetId, objectKey)
      if (!prefixes || prefixes.size === 0) continue
      stripTransientPropsFromObjectInSheetState(sheetState, objectKey, prefixes)
    }
  }

  return result
}
