import deepEqual from 'fast-deep-equal'
import type {SheetAhistoricState} from '@unseenco/theatre-core/projects/store/storeTypes'
import {
  getEffectiveStaticOverrideForObject,
  getSequenceStateFromSheet,
} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import getDeep from '@unseenco/theatre-shared/utils/getDeep'
import type {PathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type {SequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import {val} from '@unseenco/theatre-dataverse'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'

function staticOverrideAtPathDiffers(
  currentSheetState: Parameters<typeof getEffectiveStaticOverrideForObject>[0],
  onDiskSheetState: Parameters<typeof getEffectiveStaticOverrideForObject>[0],
  sequenceVariant: SequenceVariantId,
  objectKey: SheetObject['address']['objectKey'],
  pathToProp: PathToProp,
): boolean {
  const currentStatic = getDeep(
    getEffectiveStaticOverrideForObject(
      currentSheetState,
      sequenceVariant,
      objectKey,
    ) ?? {},
    pathToProp,
  )
  const onDiskStatic = getDeep(
    getEffectiveStaticOverrideForObject(
      onDiskSheetState,
      sequenceVariant,
      objectKey,
    ) ?? {},
    pathToProp,
  )

  return !deepEqual(currentStatic, onDiskStatic)
}

function ahistoricStaticOverrideAtPathDiffers(
  currentAhistoricSheet: SheetAhistoricState | undefined,
  onDiskAhistoricSheet: SheetAhistoricState | undefined,
  objectKey: SheetObject['address']['objectKey'],
  pathToProp: PathToProp,
): boolean {
  const currentStatic = getDeep(
    currentAhistoricSheet?.staticOverrides?.byObject?.[objectKey] ?? {},
    pathToProp,
  )
  const onDiskStatic = getDeep(
    onDiskAhistoricSheet?.staticOverrides?.byObject?.[objectKey] ?? {},
    pathToProp,
  )

  return !deepEqual(currentStatic, onDiskStatic)
}

function keyframeAtPositionDiffers(
  currentSheetState: Parameters<typeof getSequenceStateFromSheet>[0],
  onDiskSheetState: Parameters<typeof getSequenceStateFromSheet>[0],
  obj: SheetObject,
  trackId: SequenceTrackId,
  trackVariant: SequenceVariantId,
  position: number,
): boolean {
  const objectKey = obj.address.objectKey

  const currentTrack = getSequenceStateFromSheet(
    currentSheetState,
    trackVariant,
  )?.tracksByObject[objectKey]?.trackData[trackId]
  const onDiskTrack = getSequenceStateFromSheet(
    onDiskSheetState,
    trackVariant,
  )?.tracksByObject[objectKey]?.trackData[trackId]

  const currentKeyframe = currentTrack?.keyframes.find(
    (kf) => kf.position === position,
  )
  const onDiskKeyframe = onDiskTrack?.keyframes.find(
    (kf) => kf.position === position,
  )

  return !deepEqual(currentKeyframe?.value, onDiskKeyframe?.value)
}

/**
 * Returns true when the prop differs from the project state last persisted to
 * disk (localStorage), i.e. it changed since the last save.
 */
export function propHasDivergedFromSavedState(
  obj: SheetObject,
  pathToProp: PathToProp,
  opts?: {
    sequenceTrackId?: SequenceTrackId
    trackVariant?: SequenceVariantId
    sequencePosition?: number
  },
): boolean {
  const studio = getStudio()!
  const lastPersistedOnDisk = val(
    studio.atomP.ephemeral.lastPersistedProjectState,
  )
  if (!lastPersistedOnDisk) {
    return false
  }

  const projectId = obj.address.projectId
  const sheetId = obj.address.sheetId

  const currentProjectHistoric = val(
    studio.atomP.historic.coreByProject[projectId],
  )
  const onDiskProjectHistoric = lastPersistedOnDisk.historic[projectId]
  const currentProjectAhistoric = val(
    studio.atomP.ahistoric.coreByProject[projectId],
  )
  const onDiskProjectAhistoric = lastPersistedOnDisk.ahistoric[projectId]

  const currentSheetState = currentProjectHistoric?.sheetsById[sheetId]
  const onDiskSheetState = onDiskProjectHistoric?.sheetsById[sheetId]
  const currentAhistoricSheet = currentProjectAhistoric?.sheetsById?.[sheetId]
  const onDiskAhistoricSheet = onDiskProjectAhistoric?.sheetsById?.[sheetId]

  const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)

  if (
    staticOverrideAtPathDiffers(
      currentSheetState,
      onDiskSheetState,
      activeVariant,
      obj.address.objectKey,
      pathToProp,
    )
  ) {
    return true
  }

  if (
    ahistoricStaticOverrideAtPathDiffers(
      currentAhistoricSheet,
      onDiskAhistoricSheet,
      obj.address.objectKey,
      pathToProp,
    )
  ) {
    return true
  }

  if (
    opts?.sequenceTrackId !== undefined &&
    typeof opts.sequencePosition === 'number'
  ) {
    const trackVariant = opts.trackVariant ?? activeVariant

    if (
      keyframeAtPositionDiffers(
        currentSheetState,
        onDiskSheetState,
        obj,
        opts.sequenceTrackId,
        trackVariant,
        opts.sequencePosition,
      )
    ) {
      return true
    }
  }

  return false
}
