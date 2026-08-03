import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {ContextMenuItem} from '@unseenco/theatre-studio/uiComponents/chordial/chordialInternals'
import getDeep from '@unseenco/theatre-shared/utils/getDeep'
import {usePrism} from '@unseenco/theatre-react'
import type {
  $IntentionalAny,
  SerializablePrimitive,
} from '@unseenco/theatre-shared/utils/types'
import {getPointerParts, prism, val} from '@unseenco/theatre-dataverse'
import type {Pointer} from '@unseenco/theatre-dataverse'
import get from 'lodash-es/get'
import React from 'react'
import DefaultOrStaticValueIndicator from './DefaultValueIndicator'
import type {PropTypeConfig_Compound} from '@unseenco/theatre-core/propTypes'
import {
  compoundHasSimpleDescendants,
  isPropConfigComposite,
  iteratePropType,
} from '@unseenco/theatre-shared/propTypes/utils'
import type {SequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import {createStudioSheetItemKey} from '@unseenco/theatre-shared/utils/ids'
import type {IPropPathToTrackIdTree} from '@unseenco/theatre-core/sheetObjects/SheetObjectTemplate'
import pointerDeep from '@unseenco/theatre-shared/utils/pointerDeep'
import type {NearbyKeyframesControls} from './NextPrevKeyframeCursors'
import NextPrevKeyframeCursors from './NextPrevKeyframeCursors'
import {getNearbyKeyframesOfTrack} from './getNearbyKeyframesOfTrack'
import type {KeyframeWithTrack} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/collectAggregateKeyframes'
import {emptyObject} from '@unseenco/theatre-shared/utils'
import {
  getStudioActiveSequenceVariant,
  getStudioSequence,
} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
// eslint-disable-next-line no-restricted-syntax
import {getSequenceStateFromSheet} from '@unseenco/theatre-core/sequences/sequenceVariants'

interface CommonStuff {
  beingScrubbed: boolean
  contextMenuItems: Array<ContextMenuItem>
  controlIndicators: React.ReactElement
}

/**
 * For compounds that have _no_ sequenced track in all of their descendants
 */
interface AllStatic extends CommonStuff {
  type: 'AllStatic'
}

/**
 * For compounds that have at least one sequenced track in their descendants
 */
interface HasSequences extends CommonStuff {
  type: 'HasSequences'
}

type Stuff = AllStatic | HasSequences

export function useEditingToolsForCompoundProp<T extends SerializablePrimitive>(
  pointerToProp: Pointer<{}>,
  obj: SheetObject,
  propConfig: PropTypeConfig_Compound<{}>,
): Stuff {
  const pathToProp = getPointerParts(pointerToProp).path
  const isTransient = obj.template.isTransientPropPath(pathToProp)
  const isStatic = obj.template.isStaticPropPath(pathToProp)
  const isNonSequencable = isStatic || isTransient

  return usePrism((): Stuff => {
    // if the compound has no simple descendants, then there isn't much the user can do with it
    if (!compoundHasSimpleDescendants(propConfig)) {
      return {
        type: 'AllStatic',
        beingScrubbed: false,
        contextMenuItems: [],
        controlIndicators: (
          <DefaultOrStaticValueIndicator
            hasStaticOverride={false}
            isStatic={isStatic}
            isTransient={isTransient}
            obj={obj}
            pathToProp={pathToProp}
            propConfig={propConfig}
          />
        ),
      }
    }

    /**
     * TODO This implementation is wrong because {@link stateEditors.studio.ephemeral.projects.stateByProjectId.stateBySheetId.stateByObjectKey.propsBeingScrubbed.flag}
     * does not prune empty objects
     */
    const someDescendantsBeingScrubbed = !!val(
      get(
        getStudio()!.atomP.ephemeral.projects.stateByProjectId[
          obj.address.projectId
        ].stateBySheetId[obj.address.sheetId].stateByObjectKey[
          obj.address.objectKey
        ].valuesBeingScrubbed,
        getPointerParts(pointerToProp).path,
      ),
    )

    const contextMenuItems: ContextMenuItem[] = []

    const common: CommonStuff = {
      beingScrubbed: someDescendantsBeingScrubbed,
      contextMenuItems,
      controlIndicators: <></>,
    }

    const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)

    const validSequencedTracks = val(
      obj.template.getMapOfValidSequenceTracks_forStudio(activeVariant),
    )

    const possibleSequenceTrackIds = getDeep(
      validSequencedTracks,
      pathToProp,
    ) as undefined | IPropPathToTrackIdTree

    const hasOneOrMoreSequencedTracks =
      possibleSequenceTrackIds !== undefined &&
      Object.keys(possibleSequenceTrackIds).length !== 0 // check if object is empty or undefined
    const listOfDescendantTrackIds: SequenceTrackId[] = []

    const allStaticOverrides = val(
      obj.template.getStaticButNotSequencedOverrides(activeVariant),
    )
    const staticOverrides = getDeep(
      allStaticOverrides ?? emptyObject,
      pathToProp,
    )

    let hasStatics = staticOverrides !== undefined

    if (hasOneOrMoreSequencedTracks) {
      for (const descendant of iteratePropType(propConfig, [])) {
        if (isPropConfigComposite(descendant.conf)) continue
        const sequencedTrackIdBelongingToDescendant = getDeep(
          possibleSequenceTrackIds,
          descendant.path,
        ) as SequenceTrackId | undefined
        if (typeof sequencedTrackIdBelongingToDescendant !== 'string') {
          hasStatics = true
        } else {
          listOfDescendantTrackIds.push(sequencedTrackIdBelongingToDescendant)
        }
      }
    }

    if (hasStatics || hasOneOrMoreSequencedTracks) {
      contextMenuItems.push({
        type: 'normal',
        label: 'Reset all to default',
        callback: () => {
          getStudio()!.transaction(({stateEditors}) => {
            for (const {path: subPath, conf} of iteratePropType(
              propConfig,
              [],
            )) {
              if (isPropConfigComposite(conf)) continue
              stateEditors.coreByProject.historic.sheetsById.sequence.resetPrimitivePropOnVariant(
                {
                  ...obj.address,
                  pathToProp: [...pathToProp, ...subPath],
                  sequenceVariant: activeVariant,
                },
              )
            }
          })
        },
      })
    }

    if (hasOneOrMoreSequencedTracks) {
      contextMenuItems.push({
        type: 'normal',
        label: 'Make all static',
        callback: () => {
          getStudio()!.transaction(({stateEditors}) => {
            for (const {path: subPath, conf} of iteratePropType(
              propConfig,
              [],
            )) {
              if (isPropConfigComposite(conf)) continue
              const propAddress = {
                ...obj.address,
                pathToProp: [...pathToProp, ...subPath],
              }
              const pointerToSub = pointerDeep(pointerToProp, subPath)

              stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsStatic(
                {
                  ...propAddress,
                  value: obj.getValueByPointer(pointerToSub as $IntentionalAny),
                  sequenceVariant: activeVariant,
                },
              )
            }
          })
        },
      })
    }

    if (
      !isNonSequencable &&
      (!hasOneOrMoreSequencedTracks ||
        (hasOneOrMoreSequencedTracks && hasStatics))
    ) {
      contextMenuItems.push({
        type: 'normal',
        label: 'Sequence all',
        callback: () => {
          getStudio()!.transaction(({stateEditors}) => {
            for (const {path, conf} of iteratePropType(
              propConfig,
              pathToProp,
            )) {
              if (isPropConfigComposite(conf)) continue
              const propAddress = {...obj.address, pathToProp: path}

              stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsSequenced(
                {...propAddress, sequenceVariant: activeVariant},
                propConfig,
              )
            }
          })
        },
      })
    }

    if (hasOneOrMoreSequencedTracks) {
      const controlIndicators = prism.memo(
        `controlIndicators`,
        () => (
          <ControlIndicators
            {...{
              pointerToProp,
              obj,
              possibleSequenceTrackIds,
              listOfDescendantTrackIds,
            }}
          />
        ),
        [possibleSequenceTrackIds, listOfDescendantTrackIds],
      )

      const ret: HasSequences = {
        ...common,
        type: 'HasSequences',
        controlIndicators,
      }

      return ret
    } else {
      return {
        ...common,
        type: 'AllStatic',
        controlIndicators: (
          <DefaultOrStaticValueIndicator
            hasStaticOverride={hasStatics}
            isStatic={isStatic}
            isTransient={isTransient}
            obj={obj}
            pathToProp={pathToProp}
            propConfig={propConfig}
          />
        ),
      }
    }
  }, [])
}

function ControlIndicators({
  pointerToProp,
  obj,
  possibleSequenceTrackIds,
  listOfDescendantTrackIds,
}: {
  pointerToProp: Pointer<{}>
  obj: SheetObject
  possibleSequenceTrackIds: IPropPathToTrackIdTree
  listOfDescendantTrackIds: SequenceTrackId[]
}) {
  return usePrism(() => {
    const pathToProp = getPointerParts(pointerToProp).path
    const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)

    const sequencePosition = val(getStudioSequence(obj.sheet).positionPrism)

    /*
    2/10 perf concern:
    When displaying a hierarchy like {props: {transform: {position: {x, y, z}}}},
    we'd be recalculating this variable for both `position` and `transform`. While
    we _could_ be re-using the calculation of `transform` in `position`, I think
    it's unlikely that this optimization would matter.
    */
    const nearbyKeyframesInEachTrack = listOfDescendantTrackIds
      .map((trackId) => {
        const trackVariant =
          obj.template.getSequenceVariantOwningTrack(trackId, activeVariant) ??
          activeVariant
        return {
          trackId,
          track: getSequenceStateFromSheet(
            val(
              obj.template.project.pointers.historic.sheetsById[
                obj.address.sheetId
              ],
            ),
            trackVariant,
          )?.tracksByObject[obj.address.objectKey]?.trackData[trackId],
        }
      })
      .filter(({track}) => !!track)
      .map((s) => ({
        ...s,
        nearbies: getNearbyKeyframesOfTrack(
          obj,
          {id: s.trackId, data: s.track!, sheetObject: obj},
          sequencePosition,
        ),
      }))

    const hasCur = nearbyKeyframesInEachTrack.find(
      ({nearbies}) => !!nearbies.cur,
    )
    const allCur = nearbyKeyframesInEachTrack.every(
      ({nearbies}) => !!nearbies.cur,
    )

    const closestPrev = nearbyKeyframesInEachTrack.reduce<
      undefined | KeyframeWithTrack
    >((acc, s) => {
      if (s.nearbies.prev) {
        if (
          acc === undefined ||
          s.nearbies.prev.kf.position > acc.kf.position
        ) {
          return s.nearbies.prev
        } else {
          return acc
        }
      } else {
        return acc
      }
    }, undefined)

    const closestNext = nearbyKeyframesInEachTrack.reduce<
      undefined | KeyframeWithTrack
    >((acc, s) => {
      if (s.nearbies.next) {
        if (
          acc === undefined ||
          s.nearbies.next.kf.position < acc.kf.position
        ) {
          return s.nearbies.next
        } else {
          return acc
        }
      } else {
        return acc
      }
    }, undefined)

    const toggle = () => {
      if (allCur) {
        getStudio().transaction((api) => {
          api.unset(pointerToProp)
        })
      } else if (hasCur) {
        getStudio().transaction((api) => {
          api.set(pointerToProp, val(pointerToProp))
        })
      } else {
        getStudio().transaction((api) => {
          api.set(pointerToProp, val(pointerToProp))
        })
      }
    }

    const pr: NearbyKeyframesControls = {
      cur: hasCur
        ? {
            type: 'on',
            itemKey: createStudioSheetItemKey.forCompoundPropAggregateKeyframe(
              obj,
              pathToProp,
              sequencePosition,
            ),
            toggle,
          }
        : {
            toggle,
            type: 'off',
          },
      prev:
        closestPrev !== undefined
          ? {
              position: closestPrev.kf.position,
              itemKey:
                createStudioSheetItemKey.forCompoundPropAggregateKeyframe(
                  obj,
                  pathToProp,
                  closestPrev.kf.position,
                ),
              jump: () => {
                getStudioSequence(obj.sheet).position = closestPrev.kf.position
              },
            }
          : undefined,
      next:
        closestNext !== undefined
          ? {
              position: closestNext.kf.position,
              itemKey:
                createStudioSheetItemKey.forCompoundPropAggregateKeyframe(
                  obj,
                  pathToProp,
                  closestNext.kf.position,
                ),
              jump: () => {
                getStudioSequence(obj.sheet).position = closestNext.kf.position
              },
            }
          : undefined,
    }

    return <NextPrevKeyframeCursors {...pr} />
  }, [pointerToProp, obj, possibleSequenceTrackIds, listOfDescendantTrackIds])
}
