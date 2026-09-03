import type {Pointer} from '@unseenco/theatre-dataverse'
import {val} from '@unseenco/theatre-dataverse'
import {clamp} from 'lodash-es'
import {useMemo} from 'react'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import {useCssCursorLock} from '@unseenco/theatre-studio/uiComponents/PointerEventsHandler'
import DopeSnap from '@unseenco/theatre-studio/panels/SequenceEditorPanel/RightOverlay/DopeSnap'
import {
  snapToAll,
  snapToNone,
} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/KeyframeSnapTarget'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'

export function useDragPlayheadHandlers(
  layoutP: Pointer<SequenceEditorPanelLayout>,
  containerEl: HTMLDivElement | null,
) {
  const handlers = useMemo((): Parameters<typeof useDrag>[1] => {
    return {
      debugName: 'useDragPlayheadHandlers',
      onDragStart(event) {
        if (event.target instanceof HTMLInputElement) {
          return false
        }
        if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
          return false
        }
        if (
          event
            .composedPath()
            .some((el) => el instanceof HTMLElement && el.draggable === true)
        ) {
          return false
        }

        const initialPositionInClippedSpace =
          event.clientX - containerEl!.getBoundingClientRect().left

        const initialPositionInUnitSpace = clamp(
          val(layoutP.clippedSpace.toUnitSpace)(initialPositionInClippedSpace),
          0,
          Infinity,
        )

        const setIsSeeking = val(layoutP.seeker.setIsSeeking)
        const sequence = getStudioSequence(val(layoutP.sheet))

        sequence.position = initialPositionInUnitSpace

        const posBeforeSeek = initialPositionInUnitSpace
        const scaledSpaceToUnitSpace = val(layoutP.scaledSpace.toUnitSpace)
        setIsSeeking(true)
        snapToAll()

        return {
          onDrag(dx: number, _, event) {
            const deltaPos = scaledSpaceToUnitSpace(dx)
            const unsnappedPos = clamp(
              posBeforeSeek + deltaPos,
              0,
              sequence.length,
            )

            let newPosition = unsnappedPos
            const snapPos = DopeSnap.checkIfMouseEventSnapToPos(event, {})
            if (snapPos != null) {
              newPosition = snapPos
            }

            sequence.position = newPosition
          },
          onDragEnd() {
            setIsSeeking(false)
            snapToNone()
          },
        }
      },
    }
  }, [layoutP, containerEl])

  const [isDragging] = useDrag(containerEl, handlers)
  useCssCursorLock(isDragging, 'draggingPositionInSequenceEditor', 'ew-resize')
}
