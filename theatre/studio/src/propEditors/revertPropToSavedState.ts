import cloneDeep from 'lodash-es/cloneDeep'
import deepEqual from 'fast-deep-equal'
import type {BasicKeyframedTrack} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import type {PropTypeConfig_Compound} from '@unseenco/theatre-core/propTypes'
import {
  isPropConfigComposite,
  iteratePropType,
} from '@unseenco/theatre-shared/propTypes/utils'
// eslint-disable-next-line no-restricted-syntax
import {
  DEFAULT_SEQUENCE_VARIANT,
  blockInheritedSequencePropOnVariantInSheet,
  ensureSequenceStateInSheet,
  getEffectiveStaticOverrideForObject,
  getSequenceStateFromSheet,
  unblockInheritedSequencePropOnVariantInSheet,
} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import getDeep from '@unseenco/theatre-shared/utils/getDeep'
import type {PathToProp} from '@unseenco/theatre-shared/utils/addresses'
import {encodePathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type {
  ObjectAddressKey,
  SequenceTrackId,
} from '@unseenco/theatre-shared/utils/ids'
import type {SerializablePrimitive} from '@unseenco/theatre-shared/utils/types'
import {generateSequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import type {IStateEditors} from '@unseenco/theatre-studio/store/stateEditors'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {val} from '@unseenco/theatre-dataverse'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'

type SheetState = Parameters<typeof getEffectiveStaticOverrideForObject>[0]

function getTrackAtPropPath(
  sheetState: SheetState,
  sequenceVariant: SequenceVariantId,
  objectKey: ObjectAddressKey,
  pathToProp: PathToProp,
): {trackId: SequenceTrackId; track: BasicKeyframedTrack} | undefined {
  const encodedPropPath = encodePathToProp(pathToProp)
  const tracksOfObject = getSequenceStateFromSheet(
    sheetState,
    sequenceVariant,
  )?.tracksByObject[objectKey]

  if (!tracksOfObject) return undefined

  const trackId = tracksOfObject.trackIdByPropPath[encodedPropPath]
  if (typeof trackId !== 'string') return undefined

  const track = tracksOfObject.trackData[trackId]
  if (!track) return undefined

  return {trackId, track}
}

function staticOverrideAtPathDiffers(
  currentSheetState: SheetState,
  onDiskSheetState: SheetState,
  sequenceVariant: SequenceVariantId,
  objectKey: ObjectAddressKey,
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

function sequenceAtPathDiffers(
  currentSheetState: SheetState,
  onDiskSheetState: SheetState,
  sequenceVariant: SequenceVariantId,
  objectKey: ObjectAddressKey,
  pathToProp: PathToProp,
): boolean {
  const currentTrack = getTrackAtPropPath(
    currentSheetState,
    sequenceVariant,
    objectKey,
    pathToProp,
  )
  const onDiskTrack = getTrackAtPropPath(
    onDiskSheetState,
    sequenceVariant,
    objectKey,
    pathToProp,
  )

  return !deepEqual(currentTrack?.track.keyframes, onDiskTrack?.track.keyframes)
}

function deleteTrackAtPropPath(
  sheetState: NonNullable<SheetState>,
  sequenceVariant: SequenceVariantId,
  objectKey: ObjectAddressKey,
  pathToProp: PathToProp,
): void {
  const encodedPropPath = encodePathToProp(pathToProp)
  const tracksOfObject = getSequenceStateFromSheet(
    sheetState,
    sequenceVariant,
  )?.tracksByObject[objectKey]

  if (!tracksOfObject) return

  const trackId = tracksOfObject.trackIdByPropPath[encodedPropPath]
  if (typeof trackId !== 'string') return

  delete tracksOfObject.trackIdByPropPath[encodedPropPath]
  delete tracksOfObject.trackData[trackId]
}

function restoreTrackAtPropPath(
  sheetState: NonNullable<SheetState>,
  sequenceVariant: SequenceVariantId,
  objectKey: ObjectAddressKey,
  pathToProp: PathToProp,
  onDiskTrackId: SequenceTrackId,
  onDiskTrack: BasicKeyframedTrack,
): void {
  const encodedPropPath = encodePathToProp(pathToProp)
  const sequenceState = ensureSequenceStateInSheet(sheetState, sequenceVariant)
  sequenceState.tracksByObject[objectKey] ??= {
    trackData: {},
    trackIdByPropPath: {},
  }
  const tracksOfObject = sequenceState.tracksByObject[objectKey]!

  const currentTrackId = tracksOfObject.trackIdByPropPath[encodedPropPath]
  if (
    typeof currentTrackId === 'string' &&
    currentTrackId !== onDiskTrackId
  ) {
    delete tracksOfObject.trackData[currentTrackId]
  }

  tracksOfObject.trackIdByPropPath[encodedPropPath] = onDiskTrackId
  tracksOfObject.trackData[onDiskTrackId] = cloneDeep(onDiskTrack)
}

function revertStaticOverrideToSavedState(
  stateEditors: IStateEditors,
  obj: SheetObject,
  pathToProp: PathToProp,
  sequenceVariant: SequenceVariantId,
  currentSheetState: NonNullable<SheetState>,
  onDiskSheetState: SheetState,
): void {
  const propAddress = {
    ...obj.address,
    pathToProp,
    sequenceVariant,
  }

  const onDiskStatic = getDeep(
    getEffectiveStaticOverrideForObject(
      onDiskSheetState,
      sequenceVariant,
      obj.address.objectKey,
    ) ?? {},
    pathToProp,
  ) as SerializablePrimitive | undefined

  if (onDiskStatic === undefined) {
    stateEditors.coreByProject.historic.sheetsById.staticOverrides.byObject.unsetValueOfPrimitiveProp(
      propAddress,
    )
    return
  }

  const currentHasSequenceTrack = !!getTrackAtPropPath(
    currentSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
  )

  if (currentHasSequenceTrack) {
    stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsStatic(
      {
        ...propAddress,
        value: onDiskStatic,
      },
    )
    return
  }

  stateEditors.coreByProject.historic.sheetsById.staticOverrides.byObject.setValueOfPrimitiveProp(
    {
      ...propAddress,
      value: onDiskStatic,
    },
  )
}

function revertSequenceAtPathToSavedState(
  stateEditors: IStateEditors,
  obj: SheetObject,
  pathToProp: PathToProp,
  sequenceVariant: SequenceVariantId,
  currentSheetState: NonNullable<SheetState>,
  onDiskSheetState: SheetState,
  propConfig: PropTypeConfig,
): void {
  const propAddress = {
    ...obj.address,
    pathToProp,
    sequenceVariant,
  }

  const onDiskTrackInfo = getTrackAtPropPath(
    onDiskSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
  )
  const currentTrackInfo = getTrackAtPropPath(
    currentSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
  )

  if (!onDiskTrackInfo) {
    deleteTrackAtPropPath(
      currentSheetState,
      sequenceVariant,
      obj.address.objectKey,
      pathToProp,
    )

    if (sequenceVariant !== DEFAULT_SEQUENCE_VARIANT) {
      const encodedPropPath = encodePathToProp(pathToProp)
      unblockInheritedSequencePropOnVariantInSheet(
        currentSheetState,
        sequenceVariant,
        obj.address.objectKey,
        encodedPropPath,
      )

      const onDiskVariantTracks = getSequenceStateFromSheet(
        onDiskSheetState,
        sequenceVariant,
      )?.tracksByObject[obj.address.objectKey]

      if (
        onDiskVariantTracks?.unsequencedPropPaths?.includes(encodedPropPath)
      ) {
        blockInheritedSequencePropOnVariantInSheet(
          currentSheetState,
          sequenceVariant,
          obj.address.objectKey,
          encodedPropPath,
        )
        return
      }

      const onDiskDefaultTrack = getTrackAtPropPath(
        onDiskSheetState,
        DEFAULT_SEQUENCE_VARIANT,
        obj.address.objectKey,
        pathToProp,
      )

      if (onDiskDefaultTrack) {
        restoreTrackAtPropPath(
          currentSheetState,
          sequenceVariant,
          obj.address.objectKey,
          pathToProp,
          generateSequenceTrackId(),
          onDiskDefaultTrack.track,
        )
      }
    }

    return
  }

  if (!currentTrackInfo) {
    stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsSequenced(
      propAddress,
      propConfig,
    )
  }

  restoreTrackAtPropPath(
    currentSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
    onDiskTrackInfo.trackId,
    onDiskTrackInfo.track,
  )
}

export function propCanRevertToSavedState(
  obj: SheetObject,
  pathToProp: PathToProp,
  opts?: {
    sequenceVariant?: SequenceVariantId
  },
): boolean {
  const loadedProjectHistoric = obj.template.project.config.state
  if (!loadedProjectHistoric) return false

  const sequenceVariant =
    opts?.sequenceVariant ?? getStudioActiveSequenceVariant(obj.sheet.address)
  const sheetId = obj.address.sheetId
  const currentSheetState = val(
    getStudio()!.atomP.historic.coreByProject[obj.address.projectId],
  )?.sheetsById[sheetId]
  const onDiskSheetState = loadedProjectHistoric.sheetsById[sheetId]

  return (
    staticOverrideAtPathDiffers(
      currentSheetState,
      onDiskSheetState,
      sequenceVariant,
      obj.address.objectKey,
      pathToProp,
    ) ||
    sequenceAtPathDiffers(
      currentSheetState,
      onDiskSheetState,
      sequenceVariant,
      obj.address.objectKey,
      pathToProp,
    )
  )
}

export function revertPropToSavedState(
  stateEditors: IStateEditors,
  obj: SheetObject,
  pathToProp: PathToProp,
  propConfig: PropTypeConfig,
  opts?: {
    sequenceVariant?: SequenceVariantId
  },
): void {
  const loadedProjectHistoric = obj.template.project.config.state
  if (!loadedProjectHistoric) return

  const sequenceVariant =
    opts?.sequenceVariant ?? getStudioActiveSequenceVariant(obj.sheet.address)
  const sheetId = obj.address.sheetId
  const currentSheetState =
    stateEditors.coreByProject.historic.sheetsById._ensure(obj.address)
  const onDiskSheetState = loadedProjectHistoric.sheetsById[sheetId]

  const staticDiffers = staticOverrideAtPathDiffers(
    currentSheetState,
    onDiskSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
  )
  const sequenceDiffers = sequenceAtPathDiffers(
    currentSheetState,
    onDiskSheetState,
    sequenceVariant,
    obj.address.objectKey,
    pathToProp,
  )

  if (!staticDiffers && !sequenceDiffers) return

  if (staticDiffers) {
    revertStaticOverrideToSavedState(
      stateEditors,
      obj,
      pathToProp,
      sequenceVariant,
      currentSheetState,
      onDiskSheetState,
    )
  }

  if (sequenceDiffers) {
    revertSequenceAtPathToSavedState(
      stateEditors,
      obj,
      pathToProp,
      sequenceVariant,
      currentSheetState,
      onDiskSheetState,
      propConfig,
    )
  }
}

export function compoundCanRevertToSavedState(
  obj: SheetObject,
  pathToProp: PathToProp,
  propConfig: PropTypeConfig_Compound<{}>,
): boolean {
  for (const {path, conf} of iteratePropType(propConfig, pathToProp)) {
    if (isPropConfigComposite(conf)) continue
    if (propCanRevertToSavedState(obj, path)) {
      return true
    }
  }
  return false
}
