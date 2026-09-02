import deepEqual from 'fast-deep-equal'
import type {OnDiskState} from '@unseenco/theatre-core/projects/store/storeTypes'
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

type ProjectHistoricState = OnDiskState

function staticOverrideAtPathDiffers(
  surfaceSheetState: Parameters<typeof getEffectiveStaticOverrideForObject>[0],
  permanentSheetState: Parameters<typeof getEffectiveStaticOverrideForObject>[0],
  sequenceVariant: SequenceVariantId,
  objectKey: SheetObject['address']['objectKey'],
  pathToProp: PathToProp,
): boolean {
  const surfaceStatic = getDeep(
    getEffectiveStaticOverrideForObject(
      surfaceSheetState,
      sequenceVariant,
      objectKey,
    ) ?? {},
    pathToProp,
  )
  const permanentStatic = getDeep(
    getEffectiveStaticOverrideForObject(
      permanentSheetState,
      sequenceVariant,
      objectKey,
    ) ?? {},
    pathToProp,
  )

  return !deepEqual(surfaceStatic, permanentStatic)
}

function keyframeAtPositionDiffers(
  surfaceSheetState: Parameters<typeof getSequenceStateFromSheet>[0],
  permanentSheetState: Parameters<typeof getSequenceStateFromSheet>[0],
  obj: SheetObject,
  trackId: SequenceTrackId,
  trackVariant: SequenceVariantId,
  position: number,
): boolean {
  const objectKey = obj.address.objectKey

  const surfaceTrack = getSequenceStateFromSheet(
    surfaceSheetState,
    trackVariant,
  )?.tracksByObject[objectKey]?.trackData[trackId]
  const permanentTrack = getSequenceStateFromSheet(
    permanentSheetState,
    trackVariant,
  )?.tracksByObject[objectKey]?.trackData[trackId]

  const surfaceKeyframe = surfaceTrack?.keyframes.find(
    (kf) => kf.position === position,
  )
  const permanentKeyframe = permanentTrack?.keyframes.find(
    (kf) => kf.position === position,
  )

  return !deepEqual(surfaceKeyframe?.value, permanentKeyframe?.value)
}

/**
 * Returns true when the prop's committed (permanent) project state differs from
 * the live studio surface state, e.g. while a scrub transaction is open.
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
  const projectId = obj.address.projectId
  const sheetId = obj.address.sheetId

  const surfaceProjectHistoric = val(
    studio.atomP.historic.coreByProject[projectId],
  ) as ProjectHistoricState | undefined
  const permanentProjectHistoric = val(
    studio.atomP.$persistent.historic.innerState.coreByProject[projectId],
  ) as ProjectHistoricState | undefined

  const surfaceSheetState = surfaceProjectHistoric?.sheetsById[sheetId]
  const permanentSheetState = permanentProjectHistoric?.sheetsById[sheetId]

  if (surfaceSheetState === permanentSheetState) {
    return false
  }

  const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)

  if (
    staticOverrideAtPathDiffers(
      surfaceSheetState,
      permanentSheetState,
      activeVariant,
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
        surfaceSheetState,
        permanentSheetState,
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
