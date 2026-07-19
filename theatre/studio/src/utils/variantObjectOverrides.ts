import {
  DEFAULT_SEQUENCE_VARIANT,
  isObjectAssignedToSequenceVariant,
} from '@unseenco/theatre-studio/utils/sequenceVariantHelpers'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {
  WithoutSheetInstance,
  SheetAddress,
} from '@unseenco/theatre-shared/utils/addresses'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import type {StrictRecord} from '@unseenco/theatre-shared/utils/types'
import {val} from '@unseenco/theatre-dataverse'

export function getVariantObjectOverrides(
  p: WithoutSheetInstance<SheetAddress>,
): StrictRecord<SequenceVariantId, ObjectAddressKey[]> | undefined {
  const studio = getStudio()
  if (!studio) return undefined

  return val(
    studio.atomP.historic.coreByProject[p.projectId].sheetsById[p.sheetId]
      .variantObjectOverrides,
  )
}

export function getOverriddenObjectKeysForVariant(
  p: WithoutSheetInstance<SheetAddress>,
  variant: SequenceVariantId,
): ObjectAddressKey[] {
  if (variant === DEFAULT_SEQUENCE_VARIANT) {
    return []
  }

  const overrides = getVariantObjectOverrides(p)
  return overrides?.[variant] ?? []
}

export function isObjectOverriddenInVariant(
  p: WithoutSheetInstance<SheetAddress>,
  variant: SequenceVariantId,
  objectKey: ObjectAddressKey,
): boolean {
  const studio = getStudio()
  if (!studio) {
    return variant === DEFAULT_SEQUENCE_VARIANT
  }

  const sheetState = val(
    studio.atomP.historic.coreByProject[p.projectId].sheetsById[p.sheetId],
  )

  return isObjectAssignedToSequenceVariant(sheetState, variant, objectKey)
}
