import type {
  HistoricPositionalSequence,
  SheetState_Historic,
  TrackData,
} from '@theatre/core/projects/store/types/SheetState_Historic'
import type {Pointer} from '@theatre/dataverse'
import {val} from '@theatre/dataverse'
import type {SequenceTrackId} from '@theatre/shared/utils/ids'
import {InvalidArgumentError} from '@theatre/shared/utils/errors'
import userReadableTypeOfValue from '@theatre/shared/utils/userReadableTypeOfValue'

export const DEFAULT_SEQUENCE_VARIANT = 'default' as const

export type SequenceVariantId = string

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
export function migrateSheetSequenceState(sheetState: SheetState_Historic): void {
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
  objectKey: string,
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
