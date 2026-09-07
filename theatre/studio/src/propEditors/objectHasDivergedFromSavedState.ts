import deepEqual from 'fast-deep-equal'
import type {SheetState_Historic} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {val} from '@unseenco/theatre-dataverse'
import getStudio from '@unseenco/theatre-studio/getStudio'

function objectStaticOverridesDiffer(
  currentSheet: SheetState_Historic | undefined,
  onDiskSheet: SheetState_Historic | undefined,
  objectKey: ObjectAddressKey,
): boolean {
  if (
    !deepEqual(
      currentSheet?.staticOverrides?.byObject?.[objectKey],
      onDiskSheet?.staticOverrides?.byObject?.[objectKey],
    )
  ) {
    return true
  }

  const variantIds = new Set([
    ...Object.keys(currentSheet?.staticOverridesByVariant ?? {}),
    ...Object.keys(onDiskSheet?.staticOverridesByVariant ?? {}),
  ])

  for (const variantId of variantIds) {
    if (
      !deepEqual(
        currentSheet?.staticOverridesByVariant?.[variantId]?.byObject?.[
          objectKey
        ],
        onDiskSheet?.staticOverridesByVariant?.[variantId]?.byObject?.[
          objectKey
        ],
      )
    ) {
      return true
    }
  }

  return false
}

function objectSequenceTracksDiffer(
  currentSheet: SheetState_Historic | undefined,
  onDiskSheet: SheetState_Historic | undefined,
  objectKey: ObjectAddressKey,
): boolean {
  const sequenceIds = new Set([
    ...Object.keys(currentSheet?.sequencesById ?? {}),
    ...Object.keys(onDiskSheet?.sequencesById ?? {}),
  ])

  for (const sequenceId of sequenceIds) {
    if (
      !deepEqual(
        currentSheet?.sequencesById?.[sequenceId]?.tracksByObject?.[objectKey],
        onDiskSheet?.sequencesById?.[sequenceId]?.tracksByObject?.[objectKey],
      )
    ) {
      return true
    }
  }

  // Legacy `sequence` field (pre-variants) — only compare when present on either side
  if (currentSheet?.sequence || onDiskSheet?.sequence) {
    if (
      !deepEqual(
        currentSheet?.sequence?.tracksByObject?.[objectKey],
        onDiskSheet?.sequence?.tracksByObject?.[objectKey],
      )
    ) {
      return true
    }
  }

  return false
}

/**
 * Returns true when anything on this sheet object differs from the project
 * state loaded from on-disk JSON (`config.state` passed to `getProject()`).
 */
export function objectHasDivergedFromSavedState(obj: SheetObject): boolean {
  const loadedProjectHistoric = obj.template.project.config.state
  if (!loadedProjectHistoric) {
    return false
  }

  const studio = getStudio()!
  const {projectId, sheetId, objectKey} = obj.address

  const currentProjectHistoric = val(
    studio.atomP.historic.coreByProject[projectId],
  )
  const currentProjectAhistoric = val(
    studio.atomP.ahistoric.coreByProject[projectId],
  )

  const currentSheet = currentProjectHistoric?.sheetsById[sheetId]
  const onDiskSheet = loadedProjectHistoric.sheetsById[sheetId]

  if (objectStaticOverridesDiffer(currentSheet, onDiskSheet, objectKey)) {
    return true
  }

  if (objectSequenceTracksDiffer(currentSheet, onDiskSheet, objectKey)) {
    return true
  }

  const currentAhistoric =
    currentProjectAhistoric?.sheetsById?.[sheetId]?.staticOverrides?.byObject?.[
      objectKey
    ]
  // Ahistoric overrides are studio-only and never part of on-disk JSON, so any
  // presence counts as a divergence (same rule as propHasDivergedFromSavedState).
  if (!deepEqual(currentAhistoric, undefined)) {
    return true
  }

  return false
}
