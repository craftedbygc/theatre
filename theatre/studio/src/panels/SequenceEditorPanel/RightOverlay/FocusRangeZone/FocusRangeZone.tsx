import type {Pointer} from '@unseenco/theatre-dataverse'
import {prism, val} from '@unseenco/theatre-dataverse'
import {usePrism} from '@unseenco/theatre-react'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {topStripHeight} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/RightOverlay/TopStrip'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import {useCssCursorLock} from '@unseenco/theatre-studio/uiComponents/PointerEventsHandler'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import useKeyDown from '@unseenco/theatre-studio/uiComponents/useKeyDown'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import {clamp} from 'lodash-es'
import React, {useMemo, useState} from 'react'
import styled from 'styled-components'
import FocusRangeStrip, {focusRangeStripTheme} from './FocusRangeStrip'
import FocusRangeThumb from './FocusRangeThumb'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'

const Container = styled.div<{isShiftDown: boolean}>`
  position: absolute;
  height: ${() => topStripHeight}px;
  left: 0;
  right: 0;
  box-sizing: border-box;
  cursor: ${(props) => (props.isShiftDown ? 'ew-resize' : 'default')};
`

const FocusRangeZone: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const [containerRef, containerNode] = useRefAndState<HTMLElement | null>(null)

  const existingRangeD = useMemo(
    () =>
      prism(() => {
        const {projectId, sheetId} = val(layoutP.sheet).address
        const existingRange = val(
          getStudio().atomP.ahistoric.projects.stateByProjectId[projectId]
            .stateBySheetId[sheetId].sequence.focusRange,
        )
        return existingRange
      }),
    [layoutP],
  )

  useDrag(containerNode, useFocusRangeCreationGestureHandlers(layoutP))

  const isShiftDown = useKeyDown('Shift')

  return usePrism(() => {
    return (
      <Container
        ref={containerRef as $IntentionalAny}
        isShiftDown={isShiftDown}
      >
        <FocusRangeStrip layoutP={layoutP} />
        <FocusRangeThumb thumbType="start" layoutP={layoutP} />
        <FocusRangeThumb thumbType="end" layoutP={layoutP} />
      </Container>
    )
  }, [layoutP, existingRangeD, isShiftDown])
}

export default FocusRangeZone

function useFocusRangeCreationGestureHandlers(
  layoutP: Pointer<SequenceEditorPanelLayout>,
) {
  const [isCreating, setIsCreating] = useState(false)

  useCssCursorLock(isCreating, 'dragging', 'ew-resize')

  return useMemo((): Parameters<typeof useDrag>[1] => {
    return {
      debugName: 'FocusRangeZone',
      onDragStart(event) {
        if (!event.shiftKey) {
          return false
        }

        let tempTransaction: CommitOrDiscard | undefined

        const clippedSpaceToUnitSpace = val(layoutP.clippedSpace.toUnitSpace)
        const scaledSpaceToUnitSpace = val(layoutP.scaledSpace.toUnitSpace)
        const sheet = val(layoutP.sheet)
        const sequence = getStudioSequence(sheet)

        const targetElement: HTMLElement = event.target as HTMLElement
        const rect = targetElement!.getBoundingClientRect()
        const startPosInUnitSpace = clippedSpaceToUnitSpace(
          event.clientX - rect.left,
        )
        const minFocusRangeStripWidth = scaledSpaceToUnitSpace(
          focusRangeStripTheme.rangeStripMinWidth,
        )

        setIsCreating(true)

        return {
          onDrag(dx) {
            const deltaPos = scaledSpaceToUnitSpace(dx)

            let start = startPosInUnitSpace
            let end = startPosInUnitSpace + deltaPos

            ;[start, end] = [
              clamp(start, 0, sequence.length),
              clamp(end, 0, sequence.length),
            ].map((pos) => sequence.closestGridPosition(pos))

            if (end < start) {
              ;[start, end] = [
                Math.max(Math.min(end, start - minFocusRangeStripWidth), 0),
                start,
              ]
            } else if (dx > 0) {
              end = Math.min(
                Math.max(end, start + minFocusRangeStripWidth),
                sequence.length,
              )
            }

            if (tempTransaction) {
              tempTransaction.discard()
            }

            tempTransaction = getStudio().tempTransaction(({stateEditors}) => {
              stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence.focusRange.set(
                {
                  ...sheet.address,
                  range: {start, end},
                  enabled: true,
                },
              )
            })
          },
          onDragEnd(dragHappened) {
            setIsCreating(false)
            if (dragHappened && tempTransaction !== undefined) {
              tempTransaction.commit()
            } else if (tempTransaction) {
              tempTransaction.discard()
            }
          },
        }
      },
      lockCSSCursorTo: 'ew-resize',
    }
  }, [layoutP])
}
