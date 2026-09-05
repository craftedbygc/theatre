import type {
  BasicKeyframedTrack,
  HistoricPositionalSequence,
  Keyframe,
  KeyframeType,
  SheetState_Historic,
} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {SheetAhistoricState} from '@unseenco/theatre-core/projects/store/storeTypes'
// stateEditors mutates core historic sheet state, so it needs these runtime helpers.
// eslint-disable-next-line no-restricted-syntax
import {
  DEFAULT_SEQUENCE_VARIANT,
  blockInheritedSequencePropOnVariantInSheet,
  copyObjectSequenceTracksToVariantInSheet,
  copyPrimitivePropSequenceFromDefaultToVariantInSheet,
  ensureSequenceStateInSheet,
  ensureVariantStaticOverridesByObjectInSheet,
  getSequenceStateFromSheet,
  migrateSheetSequenceState,
  unblockInheritedSequencePropOnVariantInSheet,
} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {Drafts} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import type {
  ProjectAddress,
  PropAddress,
  SheetAddress,
  SheetObjectAddress,
  WithoutSheetInstance,
} from '@unseenco/theatre-shared/utils/addresses'
import {commonRootOfPathsToProps} from '@unseenco/theatre-shared/utils/addresses'
import {encodePathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type {
  StudioSheetItemKey,
  KeyframeId,
  ObjectAddressKey,
  SequenceMarkerId,
  SequenceTrackId,
  UIPanelId,
} from '@unseenco/theatre-shared/utils/ids'
import {
  generateKeyframeId,
  generateSequenceTrackId,
} from '@unseenco/theatre-shared/utils/ids'
import removePathFromObject from '@unseenco/theatre-shared/utils/removePathFromObject'
import {transformNumber} from '@unseenco/theatre-shared/utils/transformNumber'
import type {
  IRange,
  SerializableMap,
  SerializablePrimitive,
  SerializableValue,
} from '@unseenco/theatre-shared/utils/types'
import {current} from 'immer'
import findLastIndex from 'lodash-es/findLastIndex'
import keyBy from 'lodash-es/keyBy'
import pullFromArray from 'lodash-es/pull'
import set from 'lodash-es/set'
import sortBy from 'lodash-es/sortBy'
import {graphEditorColors} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/GraphEditor/GraphEditor'
import type {
  KeyframeWithPathToPropFromCommonRoot,
  OutlineSelectable,
  OutlineSelectionState,
  PanelPosition,
  StudioAhistoricState,
  StudioEphemeralState,
  StudioHistoricStateSequenceEditorMarker,
} from './types'
import {clamp, uniq} from 'lodash-es'
import {
  isProject,
  isSheet,
  isSheetObject,
  isSheetObjectTemplate,
  isSheetTemplate,
} from '@unseenco/theatre-shared/instanceTypes'
import type SheetTemplate from '@unseenco/theatre-core/sheets/SheetTemplate'
import type SheetObjectTemplate from '@unseenco/theatre-core/sheetObjects/SheetObjectTemplate'
import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import {pointableSetUtil} from '@unseenco/theatre-shared/utils/PointableSet'

export const setDrafts__onlyMeantToBeCalledByTransaction = (
  drafts: undefined | Drafts,
): typeof stateEditors => {
  currentDrafts = drafts
  return stateEditors
}

let currentDrafts: undefined | Drafts

const drafts = (): Drafts => {
  if (currentDrafts === undefined) {
    throw new Error(
      `Calling stateEditors outside of a transaction is not allowed.`,
    )
  }

  return currentDrafts
}

namespace stateEditors {
  export namespace studio {
    export namespace historic {
      export namespace panelPositions {
        export function setPanelPosition(p: {
          panelId: UIPanelId
          position: PanelPosition
        }) {
          const h = drafts().historic
          h.panelPositions ??= {}
          h.panelPositions[p.panelId] = p.position
        }
      }
      export function setDockedMode(dockedMode: boolean) {
        drafts().historic.dockedMode = dockedMode
      }
      export namespace dockedLayout {
        export function setSize(p: {
          key: 'outlineWidth' | 'detailsWidth' | 'sequencerHeight'
          value: number
        }) {
          const h = drafts().historic
          h.dockedLayout ??= {}
          h.dockedLayout[p.key] = p.value
        }
      }
      export namespace panels {
        export function _ensure() {
          drafts().historic.panels ??= {}
          return drafts().historic.panels!
        }

        export namespace outline {
          export function _ensure() {
            const panels = stateEditors.studio.historic.panels._ensure()
            panels.outlinePanel ??= {}
            return panels.outlinePanel!
          }
          export namespace selection {
            export function set(
              selection: (
                | OutlineSelectable
                | SheetTemplate
                | SheetObjectTemplate
              )[],
            ) {
              const newSelectionState: OutlineSelectionState[] = []

              for (const item of uniq(selection)) {
                if (isProject(item)) {
                  newSelectionState.push({type: 'Project', ...item.address})
                } else if (isSheet(item)) {
                  newSelectionState.push({
                    type: 'Sheet',
                    ...item.template.address,
                  })
                } else if (isSheetTemplate(item)) {
                  newSelectionState.push({type: 'Sheet', ...item.address})
                } else if (isSheetObject(item)) {
                  newSelectionState.push({
                    type: 'SheetObject',
                    ...item.template.address,
                  })
                } else if (isSheetObjectTemplate(item)) {
                  newSelectionState.push({type: 'SheetObject', ...item.address})
                }
              }
              outline._ensure().selection = newSelectionState
            }

            export function unset() {
              outline._ensure().selection = []
            }
          }
        }

        export namespace sequenceEditor {
          export function _ensure() {
            const panels = stateEditors.studio.historic.panels._ensure()
            panels.sequenceEditor ??= {}
            return panels.sequenceEditor!
          }
          export namespace graphEditor {
            function _ensure() {
              const s = sequenceEditor._ensure()
              s.graphEditor ??= {height: 0.5, isOpen: false}
              return s.graphEditor!
            }
            export function setIsOpen(p: {isOpen: boolean}) {
              _ensure().isOpen = p.isOpen
            }
          }
        }
      }
      export namespace projects {
        export namespace stateByProjectId {
          export function _ensure(p: ProjectAddress) {
            const s = drafts().historic
            if (!s.projects.stateByProjectId[p.projectId]) {
              s.projects.stateByProjectId[p.projectId] = {
                stateBySheetId: {},
              }
            }

            return s.projects.stateByProjectId[p.projectId]!
          }

          export namespace stateBySheetId {
            export function _ensure(p: WithoutSheetInstance<SheetAddress>) {
              const projectState =
                stateEditors.studio.historic.projects.stateByProjectId._ensure(
                  p,
                )
              if (!projectState.stateBySheetId[p.sheetId]) {
                projectState.stateBySheetId[p.sheetId] = {
                  sequenceEditor: {
                    selectedPropsByObject: {},
                  },
                }
              }

              return projectState.stateBySheetId[p.sheetId]!
            }

            export function setActiveSequenceVariant(
              p: WithoutSheetInstance<SheetAddress> & {
                variant: SequenceVariantId
              },
            ) {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                p,
              ).activeSequenceVariant = p.variant
            }

            export function addVariantObjectOverride(
              p: WithoutSheetInstance<SheetAddress> & {
                variant: SequenceVariantId
                objectKey: ObjectAddressKey
              },
            ) {
              const coreSheetState =
                stateEditors.coreByProject.historic.sheetsById._ensure(p)
              coreSheetState.variantObjectOverrides ??= {}
              coreSheetState.variantObjectOverrides[p.variant] ??= []
              const list = coreSheetState.variantObjectOverrides[p.variant]!
              if (!list.includes(p.objectKey)) {
                list.push(p.objectKey)
              }

              stateEditors.coreByProject.historic.sheetsById.copyObjectSequenceTracksToVariant(
                {
                  projectId: p.projectId,
                  sheetId: p.sheetId,
                  objectKey: p.objectKey,
                  sequenceVariant: p.variant,
                },
              )
            }

            export function removeVariantObjectOverride(
              p: WithoutSheetInstance<SheetAddress> & {
                variant: SequenceVariantId
                objectKey: ObjectAddressKey
              },
            ) {
              const coreSheetState =
                stateEditors.coreByProject.historic.sheetsById._ensure(p)
              const list = coreSheetState.variantObjectOverrides?.[p.variant]
              if (!list) return

              coreSheetState.variantObjectOverrides![p.variant] = list.filter(
                (key) => key !== p.objectKey,
              )

              stateEditors.coreByProject.historic.sheetsById.clearObjectVariantState(
                {
                  projectId: p.projectId,
                  sheetId: p.sheetId,
                  objectKey: p.objectKey,
                  sequenceVariant: p.variant,
                },
              )

              delete stateBySheetId._ensure(p).sequenceEditor
                .selectedPropsByObject[p.objectKey]
            }

            export namespace sequenceEditor {
              export function addPropToGraphEditor(
                p: WithoutSheetInstance<PropAddress>,
              ) {
                const {selectedPropsByObject} =
                  stateBySheetId._ensure(p).sequenceEditor
                if (!selectedPropsByObject[p.objectKey]) {
                  selectedPropsByObject[p.objectKey] = {}
                }
                const selectedProps = selectedPropsByObject[p.objectKey]!

                const path = encodePathToProp(p.pathToProp)

                const possibleColors = new Set<string>(
                  Object.keys(graphEditorColors),
                )
                for (const [_, selectedProps] of Object.entries(
                  current(selectedPropsByObject),
                )) {
                  // debugger
                  for (const [_, takenColor] of Object.entries(
                    selectedProps!,
                  )) {
                    possibleColors.delete(takenColor!)
                  }
                }

                const color =
                  possibleColors.size > 0
                    ? possibleColors.values().next().value
                    : Object.keys(graphEditorColors)[0]

                selectedProps[path] = color
              }

              export function removePropFromGraphEditor(
                p: WithoutSheetInstance<PropAddress>,
              ) {
                const {selectedPropsByObject} =
                  stateBySheetId._ensure(p).sequenceEditor
                if (!selectedPropsByObject[p.objectKey]) {
                  return
                }
                const selectedProps = selectedPropsByObject[p.objectKey]!

                const path = encodePathToProp(p.pathToProp)

                if (selectedProps[path]) {
                  removePathFromObject(selectedPropsByObject, [
                    p.objectKey,
                    path,
                  ])
                }
              }

              function _ensureMarkers(sheetAddress: SheetAddress) {
                const sequenceEditor =
                  stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId._ensure(
                    sheetAddress,
                  ).sequenceEditor

                if (!sequenceEditor.markerSet) {
                  sequenceEditor.markerSet = pointableSetUtil.create()
                }

                return sequenceEditor.markerSet
              }

              export function replaceMarkers(p: {
                sheetAddress: SheetAddress
                markers: Array<StudioHistoricStateSequenceEditorMarker>
                snappingFunction: (p: number) => number
              }) {
                const currentMarkerSet = _ensureMarkers(p.sheetAddress)

                const sanitizedMarkers = p.markers
                  .filter((marker) => {
                    if (!isFinite(marker.position)) return false

                    return true // marker looks valid
                  })
                  .map((marker) => ({
                    ...marker,
                    position: p.snappingFunction(marker.position),
                  }))

                const newMarkersById = keyBy(sanitizedMarkers, 'id')

                /** Usually starts as the "unselected" markers */
                let markersThatArentBeingReplaced = pointableSetUtil.filter(
                  currentMarkerSet,
                  (marker) => marker && !newMarkersById[marker.id],
                )

                const markersThatArentBeingReplacedByPosition = keyBy(
                  Object.values(markersThatArentBeingReplaced.byId),
                  'position',
                )

                // If the new transformed markers overlap with any existing markers,
                // we remove the overlapped markers
                sanitizedMarkers.forEach(({position}) => {
                  const existingMarkerAtThisPosition =
                    markersThatArentBeingReplacedByPosition[position]
                  if (existingMarkerAtThisPosition) {
                    markersThatArentBeingReplaced = pointableSetUtil.remove(
                      markersThatArentBeingReplaced,
                      existingMarkerAtThisPosition.id,
                    )
                  }
                })

                Object.assign(
                  currentMarkerSet,
                  pointableSetUtil.merge([
                    markersThatArentBeingReplaced,
                    pointableSetUtil.create(
                      sanitizedMarkers.map((marker) => [marker.id, marker]),
                    ),
                  ]),
                )
              }

              export function removeMarker(options: {
                sheetAddress: SheetAddress
                markerId: SequenceMarkerId
              }) {
                const currentMarkerSet = _ensureMarkers(options.sheetAddress)
                Object.assign(
                  currentMarkerSet,
                  pointableSetUtil.remove(currentMarkerSet, options.markerId),
                )
              }

              export function updateMarker(options: {
                sheetAddress: SheetAddress
                markerId: SequenceMarkerId
                label: string
              }) {
                const currentMarkerSet = _ensureMarkers(options.sheetAddress)
                const marker = currentMarkerSet.byId[options.markerId]
                if (marker !== undefined) marker.label = options.label
              }
            }
          }
        }
      }
    }
    export namespace ephemeral {
      export function setShowOutline(
        showOutline: StudioEphemeralState['showOutline'],
      ) {
        drafts().ephemeral.showOutline = showOutline
      }
      export namespace projects {
        export namespace stateByProjectId {
          export function _ensure(p: ProjectAddress) {
            const s = drafts().ephemeral
            if (!s.projects.stateByProjectId[p.projectId]) {
              s.projects.stateByProjectId[p.projectId] = {
                stateBySheetId: {},
              }
            }

            return s.projects.stateByProjectId[p.projectId]!
          }

          export namespace stateBySheetId {
            export function _ensure(p: WithoutSheetInstance<SheetAddress>) {
              const projectState =
                stateEditors.studio.ephemeral.projects.stateByProjectId._ensure(
                  p,
                )
              if (!projectState.stateBySheetId[p.sheetId]) {
                projectState.stateBySheetId[p.sheetId] = {
                  stateByObjectKey: {},
                }
              }

              return projectState.stateBySheetId[p.sheetId]!
            }

            export namespace stateByObjectKey {
              export function _ensure(
                p: WithoutSheetInstance<SheetObjectAddress>,
              ) {
                const s =
                  stateEditors.studio.ephemeral.projects.stateByProjectId.stateBySheetId._ensure(
                    p,
                  ).stateByObjectKey
                s[p.objectKey] ??= {}
                return s[p.objectKey]!
              }
              export namespace propsBeingScrubbed {
                export function _ensure(
                  p: WithoutSheetInstance<SheetObjectAddress>,
                ) {
                  const s =
                    stateEditors.studio.ephemeral.projects.stateByProjectId.stateBySheetId.stateByObjectKey._ensure(
                      p,
                    )

                  s.valuesBeingScrubbed ??= {}
                  return s.valuesBeingScrubbed!
                }
                export function flag(p: WithoutSheetInstance<PropAddress>) {
                  set(_ensure(p), p.pathToProp, true)
                }
              }
            }
          }
        }
      }
    }
    export namespace ahistoric {
      export function setPinOutline(
        pinOutline: StudioAhistoricState['pinOutline'],
      ) {
        drafts().ahistoric.pinOutline = pinOutline
      }
      export function setPinDetails(
        pinDetails: StudioAhistoricState['pinDetails'],
      ) {
        drafts().ahistoric.pinDetails = pinDetails
      }
      export function setPinNotifications(
        pinNotifications: StudioAhistoricState['pinNotifications'],
      ) {
        drafts().ahistoric.pinNotifications = pinNotifications
      }
      export function setPinSequenceEditor(
        pinSequenceEditor: StudioAhistoricState['pinSequenceEditor'],
      ) {
        drafts().ahistoric.pinSequenceEditor = pinSequenceEditor
      }
      export function setVisibilityState(
        visibilityState: StudioAhistoricState['visibilityState'],
      ) {
        drafts().ahistoric.visibilityState = visibilityState
      }
      export function setClipboardKeyframes(
        keyframes: KeyframeWithPathToPropFromCommonRoot[],
      ) {
        const commonPath = commonRootOfPathsToProps(
          keyframes.map((kf) => kf.pathToProp),
        )

        const keyframesWithCommonRootPath = keyframes.map(
          ({keyframe, pathToProp}) => ({
            keyframe,
            pathToProp: pathToProp.slice(commonPath.length),
          }),
        )

        // save selection
        const draft = drafts()
        if (draft.ahistoric.clipboard) {
          draft.ahistoric.clipboard.keyframesWithRelativePaths =
            keyframesWithCommonRootPath
        } else {
          draft.ahistoric.clipboard = {
            keyframesWithRelativePaths: keyframesWithCommonRootPath,
          }
        }
      }

      export namespace projects {
        export namespace stateByProjectId {
          export function _ensure(p: ProjectAddress) {
            const s = drafts().ahistoric
            if (!s.projects.stateByProjectId[p.projectId]) {
              s.projects.stateByProjectId[p.projectId] = {
                stateBySheetId: {},
              }
            }

            return s.projects.stateByProjectId[p.projectId]!
          }

          export namespace collapsedItemsInOutline {
            export function _ensure(p: ProjectAddress) {
              const projectState =
                stateEditors.studio.ahistoric.projects.stateByProjectId._ensure(
                  p,
                )
              if (!projectState.collapsedItemsInOutline) {
                projectState.collapsedItemsInOutline = {}
              }
              return projectState.collapsedItemsInOutline!
            }
            export function set(
              p: ProjectAddress & {isCollapsed: boolean; itemKey: string},
            ) {
              const collapsedItemsInOutline =
                stateEditors.studio.ahistoric.projects.stateByProjectId.collapsedItemsInOutline._ensure(
                  p,
                )

              if (p.isCollapsed) {
                collapsedItemsInOutline[p.itemKey] = true
              } else {
                delete collapsedItemsInOutline[p.itemKey]
              }
            }
          }

          export namespace stateBySheetId {
            export function _ensure(p: WithoutSheetInstance<SheetAddress>) {
              const projectState =
                stateEditors.studio.ahistoric.projects.stateByProjectId._ensure(
                  p,
                )
              if (!projectState.stateBySheetId[p.sheetId]) {
                projectState.stateBySheetId[p.sheetId] = {}
              }

              return projectState.stateBySheetId[p.sheetId]!
            }

            export namespace sequence {
              export function _ensure(p: WithoutSheetInstance<SheetAddress>) {
                const sheetState =
                  stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId._ensure(
                    p,
                  )
                if (!sheetState.sequence) {
                  sheetState.sequence = {}
                }
                return sheetState.sequence!
              }

              export namespace focusRange {
                export function set(
                  p: WithoutSheetInstance<SheetAddress> & {
                    range: IRange
                    enabled: boolean
                  },
                ) {
                  stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence._ensure(
                    p,
                  ).focusRange = {range: p.range, enabled: p.enabled}
                }

                export function unset(p: WithoutSheetInstance<SheetAddress>) {
                  stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence._ensure(
                    p,
                  ).focusRange = undefined
                }
              }

              export function setLooping(
                p: WithoutSheetInstance<SheetAddress> & {
                  looping: boolean
                },
              ) {
                stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence._ensure(
                  p,
                ).looping = p.looping
              }

              export namespace clippedSpaceRange {
                export function set(
                  p: WithoutSheetInstance<SheetAddress> & {
                    range: IRange
                  },
                ) {
                  stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence._ensure(
                    p,
                  ).clippedSpaceRange = {...p.range}
                }
              }

              export namespace sequenceEditorCollapsableItems {
                function _ensure(p: WithoutSheetInstance<SheetAddress>) {
                  const seq =
                    stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence._ensure(
                      p,
                    )
                  let existing = seq.collapsableItems
                  if (!existing) {
                    existing = seq.collapsableItems = pointableSetUtil.create()
                  }
                  return existing
                }
                export function set(
                  p: WithoutSheetInstance<SheetAddress> & {
                    studioSheetItemKey: StudioSheetItemKey
                    isCollapsed: boolean
                  },
                ) {
                  const collapsableSet = _ensure(p)
                  Object.assign(
                    collapsableSet,
                    pointableSetUtil.add(collapsableSet, p.studioSheetItemKey, {
                      isCollapsed: p.isCollapsed,
                    }),
                  )
                }
              }
            }
          }
        }
      }
    }
  }
  export namespace coreByProject {
    export namespace historic {
      export namespace revisionHistory {
        export function add(p: ProjectAddress & {revision: string}) {
          const revisionHistory =
            drafts().historic.coreByProject[p.projectId].revisionHistory

          const maxNumOfRevisionsToKeep = 50
          revisionHistory.unshift(p.revision)
          if (revisionHistory.length > maxNumOfRevisionsToKeep) {
            revisionHistory.length = maxNumOfRevisionsToKeep
          }
        }
      }
      export namespace sheetsById {
        export function _ensure(
          p: WithoutSheetInstance<SheetAddress>,
        ): SheetState_Historic {
          const sheetsById =
            drafts().historic.coreByProject[p.projectId].sheetsById

          if (!sheetsById[p.sheetId]) {
            sheetsById[p.sheetId] = {staticOverrides: {byObject: {}}}
          }
          return sheetsById[p.sheetId]!
        }

        export function forgetObject(
          p: WithoutSheetInstance<SheetObjectAddress>,
        ) {
          const sheetState =
            drafts().historic.coreByProject[p.projectId].sheetsById[p.sheetId]
          if (!sheetState) return
          delete sheetState.staticOverrides.byObject[p.objectKey]

          if (sheetState.staticOverridesByVariant) {
            for (const variantOverrides of Object.values(
              sheetState.staticOverridesByVariant,
            )) {
              delete variantOverrides?.byObject[p.objectKey]
            }
          }

          migrateSheetSequenceState(sheetState)
          if (sheetState.sequencesById) {
            for (const sequence of Object.values(sheetState.sequencesById)) {
              if (!sequence) continue
              delete sequence.tracksByObject[p.objectKey]
            }
          }
          if (sheetState.sequence) {
            delete sheetState.sequence.tracksByObject[p.objectKey]
          }

          if (sheetState.variantObjectOverrides) {
            for (const variantId of Object.keys(
              sheetState.variantObjectOverrides,
            )) {
              const list = sheetState.variantObjectOverrides[variantId]
              if (!list) continue
              sheetState.variantObjectOverrides[variantId] = list.filter(
                (key) => key !== p.objectKey,
              )
            }
          }
        }

        export function clearObjectVariantState(
          p: WithoutSheetInstance<SheetObjectAddress> & {
            sequenceVariant: SequenceVariantId
          },
        ) {
          if (p.sequenceVariant === DEFAULT_SEQUENCE_VARIANT) return

          const sheetState =
            drafts().historic.coreByProject[p.projectId].sheetsById[p.sheetId]
          if (!sheetState) return

          delete sheetState.staticOverridesByVariant?.[p.sequenceVariant]
            ?.byObject[p.objectKey]

          migrateSheetSequenceState(sheetState)
          const sequenceState = sheetState.sequencesById?.[p.sequenceVariant]
          if (sequenceState) {
            delete sequenceState.tracksByObject[p.objectKey]
          }
        }

        export function copyObjectSequenceTracksToVariant(
          p: WithoutSheetInstance<SheetObjectAddress> & {
            sequenceVariant: SequenceVariantId
          },
        ) {
          const sheetState =
            drafts().historic.coreByProject[p.projectId].sheetsById[p.sheetId]
          if (!sheetState) return

          copyObjectSequenceTracksToVariantInSheet(
            sheetState,
            p.objectKey,
            p.sequenceVariant,
          )
        }

        export function forgetSheet(p: WithoutSheetInstance<SheetAddress>) {
          const sheetState =
            drafts().historic.coreByProject[p.projectId].sheetsById[p.sheetId]
          if (sheetState) {
            delete drafts().historic.coreByProject[p.projectId].sheetsById[
              p.sheetId
            ]
          }
        }

        export namespace sequence {
          export function _ensure(
            p: WithoutSheetInstance<SheetAddress> & {
              sequenceVariant?: SequenceVariantId
            },
          ): HistoricPositionalSequence {
            const s = stateEditors.coreByProject.historic.sheetsById._ensure(p)
            const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
            return ensureSequenceStateInSheet(s, variantId)
          }

          export function setLength(
            p: WithoutSheetInstance<SheetAddress> & {
              length: number
              sequenceVariant?: SequenceVariantId
            },
          ) {
            _ensure(p).length = clamp(
              parseFloat(p.length.toFixed(2)),
              0.01,
              Infinity,
            )
          }

          function _ensureTracksOfObject(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const s =
              stateEditors.coreByProject.historic.sheetsById.sequence._ensure(
                p,
              ).tracksByObject

            s[p.objectKey] ??= {trackData: {}, trackIdByPropPath: {}}

            return s[p.objectKey]!
          }

          export function setPrimitivePropAsSequenced(
            p: WithoutSheetInstance<PropAddress> & {
              sequenceVariant?: SequenceVariantId
            },
            config: PropTypeConfig,
          ) {
            const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
            const sheetState =
              stateEditors.coreByProject.historic.sheetsById._ensure(p)
            const pathEncoded = encodePathToProp(p.pathToProp)

            unblockInheritedSequencePropOnVariantInSheet(
              sheetState,
              variantId,
              p.objectKey,
              pathEncoded,
            )

            const tracks = _ensureTracksOfObject(p)
            const possibleTrackId = tracks.trackIdByPropPath[pathEncoded]
            if (typeof possibleTrackId === 'string') return

            const trackId = generateSequenceTrackId()

            const track: BasicKeyframedTrack = {
              type: 'BasicKeyframedTrack',
              __debugName: `${p.objectKey}:${pathEncoded}`,
              keyframes: [],
            }

            tracks.trackData[trackId] = track
            tracks.trackIdByPropPath[pathEncoded] = trackId
          }

          export function setPrimitivePropAsStatic(
            p: WithoutSheetInstance<PropAddress> & {
              value: SerializablePrimitive
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
            const sheetState =
              stateEditors.coreByProject.historic.sheetsById._ensure(p)
            const encodedPropPath = encodePathToProp(p.pathToProp)
            const tracks = _ensureTracksOfObject({
              ...p,
              sequenceVariant: variantId,
            })
            const variantTrackId = tracks.trackIdByPropPath[encodedPropPath]

            if (typeof variantTrackId === 'string') {
              delete tracks.trackIdByPropPath[encodedPropPath]
              delete tracks.trackData[variantTrackId]
            }

            if (variantId === DEFAULT_SEQUENCE_VARIANT) {
              if (typeof variantTrackId !== 'string') return
            } else {
              const defaultTrackId = getSequenceStateFromSheet(
                sheetState,
                DEFAULT_SEQUENCE_VARIANT,
              )?.tracksByObject[p.objectKey]?.trackIdByPropPath[encodedPropPath]

              if (typeof defaultTrackId === 'string') {
                blockInheritedSequencePropOnVariantInSheet(
                  sheetState,
                  variantId,
                  p.objectKey,
                  encodedPropPath,
                )
              } else if (typeof variantTrackId !== 'string') {
                return
              }
            }

            stateEditors.coreByProject.historic.sheetsById.staticOverrides.byObject.setValueOfPrimitiveProp(
              {...p, sequenceVariant: variantId},
            )
          }

          export function resetPrimitivePropOnVariant(
            p: WithoutSheetInstance<PropAddress> & {
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
            const sheetState =
              stateEditors.coreByProject.historic.sheetsById._ensure(p)
            const encodedPropPath = encodePathToProp(p.pathToProp)

            stateEditors.coreByProject.historic.sheetsById.staticOverrides.byObject.unsetValueOfPrimitiveProp(
              {...p, sequenceVariant: variantId},
            )

            if (variantId !== DEFAULT_SEQUENCE_VARIANT) {
              copyPrimitivePropSequenceFromDefaultToVariantInSheet(
                sheetState,
                p.objectKey,
                variantId,
                encodedPropPath,
              )
              return
            }

            const tracks = _ensureTracksOfObject(p)
            const variantTrackId = tracks.trackIdByPropPath[encodedPropPath]
            if (typeof variantTrackId === 'string') {
              delete tracks.trackIdByPropPath[encodedPropPath]
              delete tracks.trackData[variantTrackId]
            }
          }

          export function setCompoundPropAsStatic(
            p: WithoutSheetInstance<PropAddress> & {
              value: SerializableMap
            },
          ) {
            const tracks = _ensureTracksOfObject(p)

            for (const encodedPropPath of Object.keys(
              tracks.trackIdByPropPath,
            )) {
              const propPath = JSON.parse(encodedPropPath)
              const isSubOfTargetPath = p.pathToProp.every(
                (key, i) => propPath[i] === key,
              )
              if (isSubOfTargetPath) {
                const trackId = tracks.trackIdByPropPath[encodedPropPath]
                if (typeof trackId !== 'string') continue
                delete tracks.trackIdByPropPath[encodedPropPath]
                delete tracks.trackData[trackId]
              }
            }

            stateEditors.coreByProject.historic.sheetsById.staticOverrides.byObject.setValueOfCompoundProp(
              p,
            )
          }

          function _getTrack(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
            },
          ) {
            return _ensureTracksOfObject(p).trackData[p.trackId]
          }

          function _getKeyframeById(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeId: KeyframeId
            },
          ): Keyframe | undefined {
            const track = _getTrack(p)
            if (!track) return
            return track.keyframes.find((kf) => kf.id === p.keyframeId)
          }

          /**
           * Sets a keyframe at the exact specified position.
           * Any position snapping should be done by the caller.
           */
          export function setKeyframeAtPosition<T extends SerializableValue>(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              position: number
              handles?: [number, number, number, number]
              value: T
              snappingFunction: SnappingFunction
              type?: KeyframeType
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const position = p.snappingFunction(p.position)
            const track = _getTrack(p)
            if (!track) return
            const {keyframes} = track
            const existingKeyframeIndex = keyframes.findIndex(
              (kf) => kf.position === position,
            )
            if (existingKeyframeIndex !== -1) {
              const kf = keyframes[existingKeyframeIndex]
              kf.value = p.value
              return
            }
            const indexOfLeftKeyframe = findLastIndex(
              keyframes,
              (kf) => kf.position < position,
            )
            if (indexOfLeftKeyframe === -1) {
              keyframes.unshift({
                // generating the keyframe within the `setKeyframeAtPosition` makes it impossible for us
                // to make this business logic deterministic, which is important to guarantee for collaborative
                // editing.
                id: generateKeyframeId(),
                position,
                connectedRight: true,
                handles: p.handles || [0.5, 1, 0.5, 0],
                type: p.type || 'bezier',
                value: p.value,
              })
              return
            }
            const leftKeyframe = keyframes[indexOfLeftKeyframe]
            keyframes.splice(indexOfLeftKeyframe + 1, 0, {
              id: generateKeyframeId(),
              position,
              connectedRight: leftKeyframe.connectedRight,
              handles: p.handles || [0.5, 1, 0.5, 0],
              type: p.type || 'bezier',
              value: p.value,
            })
          }

          export function unsetKeyframeAtPosition(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              position: number
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const track = _getTrack(p)
            if (!track) return
            const {keyframes} = track
            const index = keyframes.findIndex(
              (kf) => kf.position === p.position,
            )
            if (index === -1) return

            keyframes.splice(index, 1)
          }

          type SnappingFunction = (p: number) => number

          export function transformKeyframes(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeIds: KeyframeId[]
              translate: number
              scale: number
              origin: number
              snappingFunction: SnappingFunction
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const track = _getTrack(p)
            if (!track) return
            const initialKeyframes = current(track.keyframes)

            const selectedKeyframes = initialKeyframes.filter((kf) =>
              p.keyframeIds.includes(kf.id),
            )

            const transformed = selectedKeyframes.map((untransformedKf) => {
              const oldPosition = untransformedKf.position
              const newPosition = p.snappingFunction(
                transformNumber(oldPosition, p),
              )
              return {...untransformedKf, position: newPosition}
            })

            replaceKeyframes({...p, keyframes: transformed})
          }

          /**
           * Sets the easing between keyframes
           *
           * X = in keyframeIds
           * * = not in keyframeIds
           * + = modified handle
           * ```
           * X- --- -*- --- -X
           * X+ --- +*- --- -X+
           * ```
           *
           * TODO - explain further
           */
          export function setTweenBetweenKeyframes(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeIds: KeyframeId[]
              handles: [number, number, number, number]
            },
          ) {
            const track = _getTrack(p)
            if (!track) return

            track.keyframes = track.keyframes.map((kf, i) => {
              const prevKf = track.keyframes[i - 1]
              const isBeingEdited = p.keyframeIds.includes(kf.id)
              const isAfterEditedKeyframe = p.keyframeIds.includes(prevKf?.id)

              if (isBeingEdited && !isAfterEditedKeyframe) {
                return {
                  ...kf,
                  handles: [
                    kf.handles[0],
                    kf.handles[1],
                    p.handles[0],
                    p.handles[1],
                  ],
                }
              } else if (isBeingEdited && isAfterEditedKeyframe) {
                return {
                  ...kf,
                  handles: [
                    p.handles[2],
                    p.handles[3],
                    p.handles[0],
                    p.handles[1],
                  ],
                }
              } else if (isAfterEditedKeyframe) {
                return {
                  ...kf,
                  handles: [
                    p.handles[2],
                    p.handles[3],
                    kf.handles[2],
                    kf.handles[3],
                  ],
                }
              } else {
                return kf
              }
            })
          }

          export function setHandlesForKeyframe(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeId: KeyframeId
              start?: [number, number]
              end?: [number, number]
            },
          ) {
            const keyframe = _getKeyframeById(p)
            if (keyframe) {
              keyframe.handles = [
                p.end?.[0] ?? keyframe.handles[0],
                p.end?.[1] ?? keyframe.handles[1],
                p.start?.[0] ?? keyframe.handles[2],
                p.start?.[1] ?? keyframe.handles[3],
              ]
            }
          }

          export function deleteKeyframes(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeIds: KeyframeId[]
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const track = _getTrack(p)
            if (!track) return

            track.keyframes = track.keyframes.filter(
              (kf) => p.keyframeIds.indexOf(kf.id) === -1,
            )
          }

          export function setKeyframeType(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeId: KeyframeId
              keyframeType: KeyframeType
            },
          ) {
            const kf = _getKeyframeById(p)
            if (kf) {
              kf.type = p.keyframeType
            }
          }

          export function setTweenLabel(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframeId: KeyframeId
              tweenLabel: string | undefined
            },
          ) {
            const keyframe = _getKeyframeById(p)
            if (!keyframe) return

            if (p.tweenLabel === undefined || p.tweenLabel === '') {
              delete keyframe.tweenLabel
            } else {
              keyframe.tweenLabel = p.tweenLabel
            }
          }

          // Future: consider whether a list of "partial" keyframes requiring `id` is possible to accept
          //  * Consider how common this pattern is, as this sort of concept would best be encountered
          //    a few times to start to see an opportunity for improved ergonomics / crdt.
          export function replaceKeyframes(
            p: WithoutSheetInstance<SheetObjectAddress> & {
              trackId: SequenceTrackId
              keyframes: Array<Keyframe>
              snappingFunction: SnappingFunction
              sequenceVariant?: SequenceVariantId
            },
          ) {
            const track = _getTrack(p)
            if (!track) return
            const initialKeyframes = current(track.keyframes)
            const sanitizedKeyframes = p.keyframes
              .filter((kf) => {
                if (typeof kf.value === 'number' && !isFinite(kf.value))
                  return false
                if (!kf.handles.every((handleValue) => isFinite(handleValue)))
                  return false

                return true
              })
              .map((kf) => ({...kf, position: p.snappingFunction(kf.position)}))

            const newKeyframesById = keyBy(sanitizedKeyframes, 'id')

            const unselected = initialKeyframes.filter(
              (kf) => !newKeyframesById[kf.id],
            )

            const unselectedByPosition = keyBy(unselected, 'position')

            // If the new transformed keyframes overlap with any existing keyframes,
            // we remove the overlapped keyframes
            sanitizedKeyframes.forEach(({position}) => {
              const existingKeyframeAtThisPosition =
                unselectedByPosition[position]
              if (existingKeyframeAtThisPosition) {
                pullFromArray(unselected, existingKeyframeAtThisPosition)
              }
            })

            const sorted = sortBy(
              [...unselected, ...sanitizedKeyframes],
              'position',
            )

            track.keyframes = sorted
          }
        }

        export namespace staticOverrides {
          export namespace byObject {
            function _ensure(
              p: WithoutSheetInstance<SheetObjectAddress> & {
                sequenceVariant?: SequenceVariantId
              },
            ) {
              const sheetState =
                stateEditors.coreByProject.historic.sheetsById._ensure(p)
              const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
              const byObject = ensureVariantStaticOverridesByObjectInSheet(
                sheetState,
                variantId,
              )
              byObject[p.objectKey] ??= {}
              return byObject[p.objectKey]!
            }

            export function setValueOfCompoundProp(
              p: WithoutSheetInstance<PropAddress> & {
                value: SerializableMap
                sequenceVariant?: SequenceVariantId
              },
            ) {
              const existingOverrides = _ensure(p)
              set(existingOverrides, p.pathToProp, p.value)
            }

            export function setValueOfPrimitiveProp(
              p: WithoutSheetInstance<PropAddress> & {
                value: SerializablePrimitive
                sequenceVariant?: SequenceVariantId
              },
            ) {
              const existingOverrides = _ensure(p)
              set(existingOverrides, p.pathToProp, p.value)
            }

            export function unsetValueOfPrimitiveProp(
              p: WithoutSheetInstance<PropAddress> & {
                sequenceVariant?: SequenceVariantId
              },
            ) {
              const sheetState =
                stateEditors.coreByProject.historic.sheetsById._ensure(p)
              const variantId = p.sequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
              const encodedPropPath = encodePathToProp(p.pathToProp)

              unblockInheritedSequencePropOnVariantInSheet(
                sheetState,
                variantId,
                p.objectKey,
                encodedPropPath,
              )

              const byObject = ensureVariantStaticOverridesByObjectInSheet(
                sheetState,
                variantId,
              )
              const existingStaticOverrides = byObject[p.objectKey]

              if (!existingStaticOverrides) return

              removePathFromObject(existingStaticOverrides, p.pathToProp)
            }
          }
        }
      }
    }

    export namespace ahistoric {
      export namespace sheetsById {
        export function _ensure(
          p: WithoutSheetInstance<SheetAddress>,
        ): SheetAhistoricState {
          const projectAhistoric = drafts().ahistoric.coreByProject[p.projectId]
          projectAhistoric.sheetsById ??= {}
          const sheetsById = projectAhistoric.sheetsById
          if (!sheetsById[p.sheetId]) {
            sheetsById[p.sheetId] = {staticOverrides: {byObject: {}}}
          }
          return sheetsById[p.sheetId]!
        }

        export namespace staticOverrides {
          export namespace byObject {
            function _ensure(p: WithoutSheetInstance<SheetObjectAddress>) {
              const byObject =
                stateEditors.coreByProject.ahistoric.sheetsById._ensure(p)
                  .staticOverrides.byObject
              byObject[p.objectKey] ??= {}
              return byObject[p.objectKey]!
            }

            export function setValueOfPrimitiveProp(
              p: WithoutSheetInstance<PropAddress> & {
                value: SerializablePrimitive
              },
            ) {
              const existingOverrides = _ensure(p)
              set(existingOverrides, p.pathToProp, p.value)
            }

            export function unsetValueOfPrimitiveProp(
              p: WithoutSheetInstance<PropAddress>,
            ) {
              const existingOverrides =
                stateEditors.coreByProject.ahistoric.sheetsById._ensure(p)
                  .staticOverrides.byObject[p.objectKey]
              if (!existingOverrides) return
              removePathFromObject(existingOverrides, p.pathToProp)
            }
          }
        }
      }
    }
  }
}

export type IStateEditors = typeof stateEditors
