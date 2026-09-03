import type {TrackData} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import {createStudioSheetItemKey} from '@unseenco/theatre-shared/utils/ids'
import type {
  KeyframeWithTrack,
  TrackWithId,
} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'

const cache = new WeakMap<
  TrackData,
  [seqPosition: number, nearbyKeyframes: NearbyKeyframes]
>()

const noKeyframes: NearbyKeyframes = {}

/**
 * Matches {@link Sequence.closestGridPosition} (`toFixed(3)`) so a playhead
 * that sits on a keyframe visually isn't treated as "between" keyframes due
 * to float noise.
 */
export function normalizeSequencePosition(position: number): number {
  return parseFloat(position.toFixed(3))
}

export function sequencePositionsEqual(a: number, b: number): boolean {
  return normalizeSequencePosition(a) === normalizeSequencePosition(b)
}

export function getNearbyKeyframesOfTrack(
  obj: SheetObject,
  track: TrackWithId | undefined,
  sequencePosition: number,
): NearbyKeyframes {
  if (!track || track.data.keyframes.length === 0) return noKeyframes

  const pos = normalizeSequencePosition(sequencePosition)

  const cachedItem = cache.get(track.data)
  if (cachedItem && cachedItem[0] === pos) {
    return cachedItem[1]
  }

  function getKeyframeWithTrackId(idx: number): KeyframeWithTrack | undefined {
    if (!track) return
    const found = track.data.keyframes[idx]
    return (
      found && {
        kf: found,
        track,
        itemKey: createStudioSheetItemKey.forTrackKeyframe(
          obj,
          track.id,
          found.id,
        ),
      }
    )
  }

  const calculate = (): NearbyKeyframes => {
    const nextOrCurIdx = track.data.keyframes.findIndex(
      (kf) => normalizeSequencePosition(kf.position) >= pos,
    )

    if (nextOrCurIdx === -1) {
      return {
        prev: getKeyframeWithTrackId(track.data.keyframes.length - 1),
      }
    }

    const nextOrCur = getKeyframeWithTrackId(nextOrCurIdx)!
    if (sequencePositionsEqual(nextOrCur.kf.position, pos)) {
      return {
        prev: getKeyframeWithTrackId(nextOrCurIdx - 1),
        cur: nextOrCur,
        next: getKeyframeWithTrackId(nextOrCurIdx + 1),
      }
    } else {
      return {
        next: nextOrCur,
        prev: getKeyframeWithTrackId(nextOrCurIdx - 1),
      }
    }
  }

  const result = calculate()
  cache.set(track.data, [pos, result])

  return result
}

export type NearbyKeyframes = {
  prev?: KeyframeWithTrack
  cur?: KeyframeWithTrack
  next?: KeyframeWithTrack
}
