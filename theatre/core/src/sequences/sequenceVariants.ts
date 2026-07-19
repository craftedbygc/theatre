import type {
  HistoricPositionalSequence,
  SheetState_Historic,
  TrackData,
} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {PathToProp_Encoded} from '@unseenco/theatre-shared/utils/addresses'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {val} from '@unseenco/theatre-dataverse'
import type {
  SequenceTrackId,
  ObjectAddressKey,
} from '@unseenco/theatre-shared/utils/ids'
import {generateSequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import {InvalidArgumentError} from '@unseenco/theatre-shared/utils/errors'
import userReadableTypeOfValue from '@unseenco/theatre-shared/utils/userReadableTypeOfValue'
import type {
  SerializableMap,
  StrictRecord,
} from '@unseenco/theatre-shared/utils/types'
import {cloneDeep, merge} from 'lodash-es'

export const DEFAULT_SEQUENCE_VARIANT = 'default' as const

export type SequenceVariantId = string

export type EffectiveSequenceTrack = {
  trackId: SequenceTrackId
  trackVariant: SequenceVariantId
}

/**
 * Merges track maps so the default variant provides the base sequencing and the
 * active variant overrides individual props when it has its own track.
 */
export function mergeSequenceTrackMaps(
  defaultTracks: StrictRecord<PathToProp_Encoded, SequenceTrackId> | undefined,
  overrideTracks: StrictRecord<PathToProp_Encoded, SequenceTrackId> | undefined,
  activeVariant: SequenceVariantId,
): StrictRecord<PathToProp_Encoded, EffectiveSequenceTrack> {
  const merged: StrictRecord<PathToProp_Encoded, EffectiveSequenceTrack> = {}

  if (defaultTracks) {
    for (const [encodedPath, trackId] of Object.entries(defaultTracks)) {
      if (!trackId) continue
      merged[encodedPath as PathToProp_Encoded] = {
        trackId,
        trackVariant: DEFAULT_SEQUENCE_VARIANT,
      }
    }
  }

  if (activeVariant !== DEFAULT_SEQUENCE_VARIANT && overrideTracks) {
    for (const [encodedPath, trackId] of Object.entries(overrideTracks)) {
      if (!trackId) continue
      merged[encodedPath as PathToProp_Encoded] = {
        trackId,
        trackVariant: activeVariant,
      }
    }
  }

  return merged
}

export type StaticOverridesByObject = StrictRecord<
  ObjectAddressKey,
  SerializableMap
>

export function getDefaultStaticOverridesByObject(
  sheetState: SheetState_Historic | undefined,
): StaticOverridesByObject | undefined {
  return sheetState?.staticOverrides?.byObject
}

export function getVariantOwnStaticOverridesByObject(
  sheetState: SheetState_Historic | undefined,
  variantId: SequenceVariantId,
): StaticOverridesByObject | undefined {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) {
    return getDefaultStaticOverridesByObject(sheetState)
  }
  return sheetState?.staticOverridesByVariant?.[variantId]?.byObject
}

export function getEffectiveStaticOverrideForObject(
  sheetState: SheetState_Historic | undefined,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
): SerializableMap | undefined {
  const defaultOverrides =
    getDefaultStaticOverridesByObject(sheetState)?.[objectKey]

  if (variantId === DEFAULT_SEQUENCE_VARIANT) {
    return defaultOverrides
  }

  const variantOverrides = isObjectAssignedToSequenceVariant(
    sheetState,
    variantId,
    objectKey,
  )
    ? sheetState?.staticOverridesByVariant?.[variantId]?.byObject?.[objectKey]
    : undefined

  if (!defaultOverrides && !variantOverrides) return undefined
  if (!variantOverrides) return defaultOverrides
  if (!defaultOverrides) return variantOverrides

  return merge(cloneDeep(defaultOverrides), cloneDeep(variantOverrides))
}

export function isObjectAssignedToSequenceVariant(
  sheetState: SheetState_Historic | undefined,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
): boolean {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) return true

  return (
    sheetState?.variantObjectOverrides?.[variantId]?.includes(objectKey) ??
    false
  )
}

export function ensureVariantStaticOverridesByObjectInSheet(
  sheetState: SheetState_Historic,
  variantId: SequenceVariantId,
): StaticOverridesByObject {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) {
    sheetState.staticOverrides ??= {byObject: {}}
    return sheetState.staticOverrides.byObject
  }

  sheetState.staticOverridesByVariant ??= {}
  sheetState.staticOverridesByVariant[variantId] ??= {byObject: {}}
  return sheetState.staticOverridesByVariant[variantId]!.byObject
}

const defaultEmptySequence = (): HistoricPositionalSequence => ({
  type: 'PositionalSequence',
  length: 10,
  subUnitsPerUnit: 30,
  tracksByObject: {},
})

/**
 * Migrates legacy `sequence` to `sequencesById.default` if needed.
 * Only call this on mutable draft state (e.g. in state editors).
 */
export function migrateSheetSequenceState(
  sheetState: SheetState_Historic,
): void {
  if (!sheetState.sequencesById) {
    sheetState.sequencesById = {}
  }

  if (
    sheetState.sequence &&
    !sheetState.sequencesById[DEFAULT_SEQUENCE_VARIANT]
  ) {
    sheetState.sequencesById[DEFAULT_SEQUENCE_VARIANT] = sheetState.sequence
  }
}

export function getSequenceStateFromSheet(
  sheetState: SheetState_Historic | undefined,
  variantId: SequenceVariantId,
): HistoricPositionalSequence | undefined {
  if (!sheetState) return undefined

  if (sheetState.sequencesById?.[variantId]) {
    return sheetState.sequencesById[variantId]
  }

  // Backward compat: legacy `sequence` field maps to the 'default' variant
  if (variantId === DEFAULT_SEQUENCE_VARIANT && sheetState.sequence) {
    return sheetState.sequence
  }

  return undefined
}

/**
 * Reactive read of `tracksByObject` for a sequence variant.
 * Prefer this over `val(sheetStatePointer.sequence.tracksByObject)` inside prisms
 * so edits to `sequencesById` invalidate dependents.
 */
export function valTracksByObjectForSheetVariant(
  sheetStatePointer: Pointer<SheetState_Historic | undefined>,
  variantId: SequenceVariantId,
): HistoricPositionalSequence['tracksByObject'] | undefined {
  // Subscribe to the full map so adding a new variant key (e.g. `default` when
  // only `mobile` already exists) invalidates dependents.
  val(sheetStatePointer.sequencesById)

  const sequenceFromMap = val(sheetStatePointer.sequencesById[variantId])
  if (sequenceFromMap !== undefined) {
    return val(sheetStatePointer.sequencesById[variantId].tracksByObject)
  }

  if (variantId === DEFAULT_SEQUENCE_VARIANT) {
    return val(sheetStatePointer.sequence?.tracksByObject)
  }

  return undefined
}

/**
 * Reactive read of `trackIdByPropPath` for one object on a sequence variant.
 */
export function valTrackIdByPropPathForObject(
  sheetStatePointer: Pointer<SheetState_Historic | undefined>,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
): StrictRecord<PathToProp_Encoded, SequenceTrackId> | undefined {
  // Subscribe to the full map so adding a new variant key invalidates dependents.
  val(sheetStatePointer.sequencesById)

  const sequenceFromMap = val(sheetStatePointer.sequencesById[variantId])
  if (sequenceFromMap !== undefined) {
    // Subscribe to the tracks container so new object keys invalidate dependents.
    val(sheetStatePointer.sequencesById[variantId].tracksByObject)
    return val(
      sheetStatePointer.sequencesById[variantId].tracksByObject[objectKey]
        ?.trackIdByPropPath,
    )
  }

  if (variantId === DEFAULT_SEQUENCE_VARIANT) {
    val(sheetStatePointer.sequence?.tracksByObject)
    return val(
      sheetStatePointer.sequence?.tracksByObject[objectKey]?.trackIdByPropPath,
    )
  }

  return undefined
}

/**
 * Reactive read of props that opt out of inheriting default-variant sequences.
 */
export function valUnsequencedPropPathsForObject(
  sheetStatePointer: Pointer<SheetState_Historic | undefined>,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
): PathToProp_Encoded[] | undefined {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) return undefined

  val(sheetStatePointer.sequencesById)

  const sequenceFromMap = val(sheetStatePointer.sequencesById[variantId])
  if (sequenceFromMap !== undefined) {
    val(sheetStatePointer.sequencesById[variantId].tracksByObject)
    return val(
      sheetStatePointer.sequencesById[variantId].tracksByObject[objectKey]
        ?.unsequencedPropPaths,
    )
  }

  return undefined
}

export function blockInheritedSequencePropOnVariantInSheet(
  sheetState: SheetState_Historic,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
  encodedPropPath: PathToProp_Encoded,
): void {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) return

  const tracksByObject = ensureSequenceStateInSheet(
    sheetState,
    variantId,
  ).tracksByObject
  tracksByObject[objectKey] ??= {trackData: {}, trackIdByPropPath: {}}
  const objectTracks = tracksByObject[objectKey]!
  objectTracks.unsequencedPropPaths ??= []
  if (!objectTracks.unsequencedPropPaths.includes(encodedPropPath)) {
    objectTracks.unsequencedPropPaths.push(encodedPropPath)
  }
}

export function unblockInheritedSequencePropOnVariantInSheet(
  sheetState: SheetState_Historic,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
  encodedPropPath: PathToProp_Encoded,
): void {
  if (variantId === DEFAULT_SEQUENCE_VARIANT) return

  const objectTracks = getSequenceStateFromSheet(sheetState, variantId)
    ?.tracksByObject[objectKey]
  if (!objectTracks?.unsequencedPropPaths) return

  objectTracks.unsequencedPropPaths = objectTracks.unsequencedPropPaths.filter(
    (p) => p !== encodedPropPath,
  )

  if (objectTracks.unsequencedPropPaths.length === 0) {
    delete objectTracks.unsequencedPropPaths
  }
}

/**
 * Returns which variant owns a given track for an object, checking the active
 * variant first and then falling back to default.
 */
export function getSequenceVariantOwningTrackInSheetState(
  sheetState: SheetState_Historic | undefined,
  objectKey: ObjectAddressKey,
  trackId: SequenceTrackId,
  activeVariant: SequenceVariantId,
): SequenceVariantId | undefined {
  const findInVariant = (variantId: SequenceVariantId) => {
    const trackData = getSequenceStateFromSheet(sheetState, variantId)
      ?.tracksByObject[objectKey]?.trackData[trackId]
    return trackData ? variantId : undefined
  }

  return findInVariant(activeVariant) ?? findInVariant(DEFAULT_SEQUENCE_VARIANT)
}

export function ensureSequenceStateInSheet(
  sheetState: SheetState_Historic,
  variantId: SequenceVariantId,
): HistoricPositionalSequence {
  migrateSheetSequenceState(sheetState)

  if (!sheetState.sequencesById![variantId]) {
    sheetState.sequencesById![variantId] = defaultEmptySequence()
  }

  return sheetState.sequencesById![variantId]!
}

/**
 * Deep-copies an object's sequence tracks from the default variant into a
 * non-default variant so edits on that variant are independent.
 */
export function copyObjectSequenceTracksToVariantInSheet(
  sheetState: SheetState_Historic,
  objectKey: ObjectAddressKey,
  targetVariant: SequenceVariantId,
): void {
  if (targetVariant === DEFAULT_SEQUENCE_VARIANT) return

  migrateSheetSequenceState(sheetState)

  const sourceTracks = getSequenceStateFromSheet(
    sheetState,
    DEFAULT_SEQUENCE_VARIANT,
  )?.tracksByObject[objectKey]

  if (!sourceTracks) return

  const targetSequence = ensureSequenceStateInSheet(sheetState, targetVariant)
  targetSequence.tracksByObject[objectKey] = cloneDeep(sourceTracks)
}

/**
 * Copies one prop's sequence track from the default variant into a non-default
 * variant with a new track id so edits on either variant stay independent.
 */
export function copyPrimitivePropSequenceFromDefaultToVariantInSheet(
  sheetState: SheetState_Historic,
  objectKey: ObjectAddressKey,
  targetVariant: SequenceVariantId,
  encodedPropPath: PathToProp_Encoded,
): boolean {
  if (targetVariant === DEFAULT_SEQUENCE_VARIANT) return false

  migrateSheetSequenceState(sheetState)

  const defaultObjectTracks = getSequenceStateFromSheet(
    sheetState,
    DEFAULT_SEQUENCE_VARIANT,
  )?.tracksByObject[objectKey]
  const defaultTrackId = defaultObjectTracks?.trackIdByPropPath[encodedPropPath]

  const targetSequence = ensureSequenceStateInSheet(sheetState, targetVariant)
  targetSequence.tracksByObject[objectKey] ??= {
    trackData: {},
    trackIdByPropPath: {},
  }
  const targetObjectTracks = targetSequence.tracksByObject[objectKey]!

  const existingVariantTrackId =
    targetObjectTracks.trackIdByPropPath[encodedPropPath]
  if (typeof existingVariantTrackId === 'string') {
    delete targetObjectTracks.trackData[existingVariantTrackId]
    delete targetObjectTracks.trackIdByPropPath[encodedPropPath]
  }

  if (targetObjectTracks.unsequencedPropPaths) {
    targetObjectTracks.unsequencedPropPaths =
      targetObjectTracks.unsequencedPropPaths.filter(
        (path) => path !== encodedPropPath,
      )
    if (targetObjectTracks.unsequencedPropPaths.length === 0) {
      delete targetObjectTracks.unsequencedPropPaths
    }
  }

  if (typeof defaultTrackId !== 'string') {
    return false
  }

  const defaultTrackData = defaultObjectTracks!.trackData[defaultTrackId]
  if (!defaultTrackData) return false

  const newTrackId = generateSequenceTrackId()
  targetObjectTracks.trackData[newTrackId] = cloneDeep(defaultTrackData)
  targetObjectTracks.trackIdByPropPath[encodedPropPath] = newTrackId

  return true
}

export function validateSequenceVariantIdOrThrow(
  value: unknown,
  fnName: string,
): SequenceVariantId {
  if (typeof value !== 'string') {
    throw new InvalidArgumentError(
      `Argument 'variant' in \`${fnName}\` must be a string. Instead, it was ${userReadableTypeOfValue(
        value,
      )}.`,
    )
  }

  const idTrimmed = value.trim()
  if (idTrimmed.length !== value.length) {
    throw new InvalidArgumentError(
      `Argument 'variant' in \`${fnName}\` should not have surrounding whitespace.`,
    )
  }

  if (idTrimmed.length < 3) {
    throw new InvalidArgumentError(
      `Argument 'variant' in \`${fnName}\` should be at least 3 characters long.`,
    )
  }

  return idTrimmed
}

export function pointerToSequenceTrackData(
  sheetStatePointer: Pointer<SheetState_Historic | undefined>,
  variantId: SequenceVariantId,
  objectKey: ObjectAddressKey,
  trackId: SequenceTrackId,
): Pointer<TrackData | undefined> {
  const sheetState = val(sheetStatePointer)

  if (sheetState?.sequencesById?.[variantId]) {
    return sheetStatePointer.sequencesById[variantId].tracksByObject[objectKey]
      .trackData[trackId]
  }

  // Backward compat: legacy `sequence` field
  return sheetStatePointer.sequence.tracksByObject[objectKey].trackData[trackId]
}

export function validateSequenceVariantsOrThrow(
  variants: unknown,
  fnName: string,
): SequenceVariantId[] {
  if (!Array.isArray(variants)) {
    throw new InvalidArgumentError(
      `Argument 'variants' in \`${fnName}\` must be an array of strings.`,
    )
  }

  if (variants.length === 0) {
    throw new InvalidArgumentError(
      `Argument 'variants' in \`${fnName}\` must contain at least one variant.`,
    )
  }

  const sanitized = variants.map((v) =>
    validateSequenceVariantIdOrThrow(v, fnName),
  )

  const unique = new Set(sanitized)
  if (unique.size !== sanitized.length) {
    throw new InvalidArgumentError(
      `Argument 'variants' in \`${fnName}\` must not contain duplicates.`,
    )
  }

  if (!unique.has(DEFAULT_SEQUENCE_VARIANT)) {
    throw new InvalidArgumentError(
      `Argument 'variants' in \`${fnName}\` must include the "${DEFAULT_SEQUENCE_VARIANT}" variant.`,
    )
  }

  return sanitized
}
