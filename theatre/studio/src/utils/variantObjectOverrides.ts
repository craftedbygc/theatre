import {DEFAULT_SEQUENCE_VARIANT} from '@theatre/core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import type {WithoutSheetInstance, SheetAddress} from '@theatre/shared/utils/addresses'
import type {ObjectAddressKey} from '@theatre/shared/utils/ids'
import type {StrictRecord} from '@theatre/shared/utils/types'
import {val} from '@theatre/dataverse'

export function getVariantObjectOverrides(
  p: WithoutSheetInstance<SheetAddress>,
): StrictRecord<SequenceVariantId, ObjectAddressKey[]> | undefined {
  const studio = getStudio()
  if (!studio) return undefined

  return val(
    studio.atomP.historic.projects.stateByProjectId[p.projectId]
      .stateBySheetId[p.sheetId].variantObjectOverrides,
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
  if (variant === DEFAULT_SEQUENCE_VARIANT) {
    return true
  }

  return getOverriddenObjectKeysForVariant(p, variant).includes(objectKey)
}
