import {val} from '@unseenco/theatre-dataverse'
import React, {useMemo, useRef} from 'react'
import {ConnectorLine} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/keyframeRowUI/ConnectorLine'
import {AggregateKeyframePositionIsSelected} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/AggregatedKeyframeTrack/AggregatedKeyframeTrack'
import usePopover from '@unseenco/theatre-studio/uiComponents/Popover/usePopover'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import type {DragOpts} from '@unseenco/theatre-studio/uiComponents/useDrag'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import getStudio from '@unseenco/theatre-studio/getStudio'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import type {IAggregateKeyframeEditorUtils} from './useAggregateKeyframeEditorUtils'
import CurveEditorPopover from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/BasicKeyframedTrack/KeyframeEditor/CurveEditorPopover/CurveEditorPopover'
import {useAggregateKeyframeEditorUtils} from './useAggregateKeyframeEditorUtils'
import type {IAggregateKeyframeEditorProps} from './AggregateKeyframeEditor'
import styled from 'styled-components'
import BasicPopover from '@unseenco/theatre-studio/uiComponents/Popover/BasicPopover'
import {
  copyableKeyframesFromSelection,
  keyframesWithPaths,
} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/selections'
import useContextMenu from '@unseenco/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import {commonRootOfPathsToProps} from '@unseenco/theatre-shared/utils/addresses'
import type {KeyframeWithPathToPropFromCommonRoot} from '@unseenco/theatre-studio/store/types'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import TweenNameEditorPopover, {
  getSharedTweenLabel,
  type TweenNameEditorTarget,
} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/BasicKeyframedTrack/KeyframeEditor/TweenNameEditorPopover'

const POPOVER_MARGIN_PX = 5
const EasingPopoverWrapper = styled(BasicPopover)`
  --popover-outer-stroke: transparent;
  --popover-inner-stroke: rgba(26, 28, 30, 0.97);
`
export const AggregateCurveEditorPopover: React.FC<
  IAggregateKeyframeEditorProps & {closePopover: (reason: string) => void}
> = React.forwardRef((props, ref) => {
  const {allConnections} = useAggregateKeyframeEditorUtils(props)

  return (
    <EasingPopoverWrapper
      showPopoverEdgeTriangle={false}
      // @ts-ignore @todo
      ref={ref}
    >
      <CurveEditorPopover
        curveConnection={allConnections[0]}
        additionalConnections={allConnections}
        onRequestClose={props.closePopover}
      />
    </EasingPopoverWrapper>
  )
})

export const AggregateKeyframeConnector: React.VFC<IAggregateKeyframeConnectorProps> =
  (props) => {
    const [nodeRef, node] = useRefAndState<HTMLDivElement | null>(null)
    const {editorProps} = props

    const tweenNameTargets = useMemo((): TweenNameEditorTarget[] => {
      const cur = editorProps.aggregateKeyframes[editorProps.index]
      if (!cur) return []

      return cur.keyframes.map(({kf, track}) => ({
        sheetObject: track.sheetObject,
        trackId: track.id,
        keyframe: kf,
      }))
    }, [editorProps.aggregateKeyframes, editorProps.index])

    const tweenLabel = getSharedTweenLabel(tweenNameTargets)

    const {
      node: namePopoverNode,
      open: openNamePopover,
      close: closeNamePopover,
    } = usePopover({debugName: 'AggregateTweenNamePopover'}, () => (
      <BasicPopover showPopoverEdgeTriangle>
        <TweenNameEditorPopover
          targets={tweenNameTargets}
          onRequestClose={closeNamePopover}
        />
      </BasicPopover>
    ))

    const openTweenNameEditor = () => {
      if (node) {
        const rect = node.getBoundingClientRect()
        openNamePopover(
          {clientX: rect.left + rect.width / 2, clientY: rect.top},
          node,
        )
      }
    }

    const [contextMenu] = useConnectorContextMenu(
      props,
      node,
      tweenNameTargets,
      openTweenNameEditor,
    )
    const [isDragging] = useDragKeyframe(node, props.editorProps)

    const {
      node: popoverNode,
      toggle: togglePopover,
      close: closePopover,
    } = usePopover(
      () => {
        const rightDims = val(editorProps.layoutP.rightDims)

        return {
          debugName: 'Connector',
          constraints: {
            minX: rightDims.screenX + POPOVER_MARGIN_PX,
            maxX: rightDims.screenX + rightDims.width - POPOVER_MARGIN_PX,
          },
        }
      },
      () => {
        return (
          <AggregateCurveEditorPopover
            {...editorProps}
            closePopover={closePopover}
          />
        )
      },
    )

    const {connected, isAggregateEditingInCurvePopover} = props.utils

    // We don't want to interrupt an existing drag, so in order to persist the dragged
    // html node, we just set the connector length to 0, but we don't remove it yet.
    return connected || isDragging ? (
      <>
        <ConnectorLine
          ref={nodeRef}
          connectorLengthInUnitSpace={connected ? connected.length : 0}
          isSelected={connected ? connected.selected : false}
          isPopoverOpen={isAggregateEditingInCurvePopover}
          tweenLabel={tweenLabel}
          openPopover={(e) => {
            if (node) togglePopover(e, node)
          }}
        />
        {popoverNode}
        {namePopoverNode}
        {contextMenu}
      </>
    ) : (
      <></>
    )
  }
type IAggregateKeyframeConnectorProps = {
  utils: IAggregateKeyframeEditorUtils
  editorProps: IAggregateKeyframeEditorProps
}
function useDragKeyframe(
  node: HTMLDivElement | null,
  editorProps: IAggregateKeyframeEditorProps,
) {
  const propsRef = useRef(editorProps)
  propsRef.current = editorProps

  const gestureHandlers = useMemo<DragOpts>(() => {
    return {
      debugName: 'useDragKeyframe',
      lockCSSCursorTo: 'ew-resize',
      onDragStart(event) {
        const props = propsRef.current
        let tempTransaction: CommitOrDiscard | undefined

        const keyframes = props.aggregateKeyframes[props.index].keyframes

        const {selection, viewModel} = props
        const address =
          viewModel.type === 'sheet'
            ? viewModel.sheet.address
            : viewModel.sheetObject.address

        if (
          selection &&
          props.aggregateKeyframes[props.index].selected ===
            AggregateKeyframePositionIsSelected.AllSelected
        ) {
          return selection
            .getDragHandlers({
              ...address,
              domNode: node!,
              positionAtStartOfDrag:
                props.aggregateKeyframes[props.index].position,
            })
            .onDragStart(event)
        }

        const propsAtStartOfDrag = props
        const sequence = getStudioSequence(
          val(propsAtStartOfDrag.layoutP.sheet),
        )

        const toUnitSpace = val(
          propsAtStartOfDrag.layoutP.scaledSpace.toUnitSpace,
        )

        return {
          onDrag(dx, dy, event) {
            const delta = toUnitSpace(dx)
            if (tempTransaction) {
              tempTransaction.discard()
              tempTransaction = undefined
            }
            tempTransaction = getStudio().tempTransaction(({stateEditors}) => {
              for (const keyframe of keyframes) {
                stateEditors.coreByProject.historic.sheetsById.sequence.transformKeyframes(
                  {
                    ...keyframe.track.sheetObject.address,
                    trackId: keyframe.track.id,
                    keyframeIds: [
                      keyframe.kf.id,
                      keyframe.track.data.keyframes[
                        keyframe.track.data.keyframes.indexOf(keyframe.kf) + 1
                      ].id,
                    ],
                    translate: delta,
                    scale: 1,
                    origin: 0,
                    snappingFunction: sequence.closestGridPosition,
                  },
                )
              }
            })
          },
          onDragEnd(dragHappened) {
            if (dragHappened) {
              if (tempTransaction) {
                tempTransaction.commit()
              }
            } else {
              if (tempTransaction) {
                tempTransaction.discard()
              }
            }
          },
        }
      },
    }
  }, [])

  return useDrag(node, gestureHandlers)
}

function useConnectorContextMenu(
  props: IAggregateKeyframeConnectorProps,
  node: HTMLDivElement | null,
  tweenNameTargets: TweenNameEditorTarget[],
  openTweenNameEditor: () => void,
) {
  return useContextMenu(node, {
    displayName: 'Aggregate Tween',
    menuItems: () => {
      // see AGGREGATE_COPY_PASTE.md for explanation of this
      // code that makes some keyframes with paths for copying
      // to clipboard
      const kfs = props.utils.allConnections.reduce(
        (acc, con) =>
          acc.concat(
            keyframesWithPaths({
              ...con,
              keyframeIds: [con.left.id, con.right.id],
            }) ?? [],
          ),
        [] as KeyframeWithPathToPropFromCommonRoot[],
      )

      const commonPath = commonRootOfPathsToProps(
        kfs.map((kf) => kf.pathToProp),
      )

      const keyframesWithCommonRootPath = kfs.map(({keyframe, pathToProp}) => ({
        keyframe,
        pathToProp: pathToProp.slice(commonPath.length),
      }))

      const viewModel = props.editorProps.viewModel
      const address =
        viewModel.type === 'sheet'
          ? viewModel.sheet.address
          : viewModel.sheetObject.address

      const sharedTweenLabel = getSharedTweenLabel(tweenNameTargets)
      const tweenNameMenuItems = sharedTweenLabel
        ? [
            {
              type: 'normal' as const,
              label: 'Edit tween name',
              callback: openTweenNameEditor,
            },
            {
              type: 'normal' as const,
              label: 'Clear tween name',
              callback: () => {
                getStudio().transaction(({stateEditors}) => {
                  for (const target of tweenNameTargets) {
                    stateEditors.coreByProject.historic.sheetsById.sequence.setTweenLabel(
                      {
                        ...target.sheetObject.address,
                        trackId: target.trackId,
                        keyframeId: target.keyframe.id,
                        tweenLabel: undefined,
                      },
                    )
                  }
                })
              },
            },
          ]
        : [
            {
              type: 'normal' as const,
              label: 'Name tween',
              callback: openTweenNameEditor,
            },
          ]

      return [
        ...tweenNameMenuItems,
        {
          type: 'normal',
          label: 'Copy',
          callback: () => {
            if (props.editorProps.selection) {
              const copyableKeyframes = copyableKeyframesFromSelection(
                address.projectId,
                address.sheetId,
                props.editorProps.selection,
              )
              getStudio().transaction((api) => {
                api.stateEditors.studio.ahistoric.setClipboardKeyframes(
                  copyableKeyframes,
                )
              })
            } else {
              getStudio().transaction((api) => {
                api.stateEditors.studio.ahistoric.setClipboardKeyframes(
                  keyframesWithCommonRootPath,
                )
              })
            }
          },
        },
        {
          type: 'normal',
          label: 'Delete',
          callback: () => {
            if (props.editorProps.selection) {
              props.editorProps.selection.delete()
            } else {
              getStudio().transaction(({stateEditors}) => {
                for (const con of props.utils.allConnections) {
                  stateEditors.coreByProject.historic.sheetsById.sequence.deleteKeyframes(
                    {
                      ...address,
                      objectKey: con.objectKey,
                      keyframeIds: [con.left.id, con.right.id],
                      trackId: con.trackId,
                    },
                  )
                }
              })
            }
          },
        },
      ]
    },
  })
}
