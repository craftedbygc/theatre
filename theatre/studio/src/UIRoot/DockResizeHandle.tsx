import getStudio from '@unseenco/theatre-studio/getStudio'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {clamp} from 'lodash-es'
import React, {useMemo} from 'react'
import styled from 'styled-components'
import {
  MAX_DOCKED_DETAILS_WIDTH,
  MAX_DOCKED_OUTLINE_WIDTH,
  MAX_DOCKED_SEQUENCER_HEIGHT,
  MIN_DOCKED_DETAILS_WIDTH,
  MIN_DOCKED_OUTLINE_WIDTH,
  MIN_DOCKED_SEQUENCER_HEIGHT,
} from './dockedLayoutConstants'
import {useLayoutMode} from './LayoutModeContext'

const Base = styled.div`
  position: absolute;
  z-index: 10;
  ${pointerEventsAutoInNormalMode};

  &:after {
    position: absolute;
    display: block;
    content: ' ';
  }

  opacity: 0;
  background-color: #478698;

  &.isDragging {
    opacity: 1;
  }

  &:hover {
    opacity: 1;
  }
`

const VerticalHandle = styled(Base)`
  top: 0;
  bottom: 0;
  width: 1px;
  cursor: ew-resize;

  &:after {
    inset: 0 -5px;
  }
`

const HorizontalHandle = styled(Base)`
  left: 0;
  right: 0;
  height: 1px;
  cursor: ns-resize;

  &:after {
    inset: -5px 0;
  }
`

const RightEdge = styled(VerticalHandle)`
  right: -1px;
`

const LeftEdge = styled(VerticalHandle)`
  left: -1px;
`

const TopEdge = styled(HorizontalHandle)`
  top: -1px;
`

type DockResizeEdge = 'outlineRight' | 'detailsLeft' | 'sequencerTop'

const edgeConfig: {
  [edge in DockResizeEdge]: {
    key: 'outlineWidth' | 'detailsWidth' | 'sequencerHeight'
    min: number
    max: number
    getDelta: (dx: number, dy: number) => number
  }
} = {
  outlineRight: {
    key: 'outlineWidth',
    min: MIN_DOCKED_OUTLINE_WIDTH,
    max: MAX_DOCKED_OUTLINE_WIDTH,
    getDelta: (dx) => dx,
  },
  detailsLeft: {
    key: 'detailsWidth',
    min: MIN_DOCKED_DETAILS_WIDTH,
    max: MAX_DOCKED_DETAILS_WIDTH,
    getDelta: (dx) => -dx,
  },
  sequencerTop: {
    key: 'sequencerHeight',
    min: MIN_DOCKED_SEQUENCER_HEIGHT,
    max: MAX_DOCKED_SEQUENCER_HEIGHT,
    getDelta: (_dx, dy) => -dy,
  },
}

const DockResizeHandle: React.FC<{edge: DockResizeEdge}> = ({edge}) => {
  const {dockedSizes} = useLayoutMode()
  const config = edgeConfig[edge]
  const [ref, node] = useRefAndState<HTMLDivElement>(null as $IntentionalAny)

  const dragOpts: Parameters<typeof useDrag>[1] = useMemo(() => {
    return {
      debugName: `DockResizeHandle-${edge}`,
      lockCursorTo: edge === 'sequencerTop' ? 'ns-resize' : 'ew-resize',
      onDragStart() {
        let tempTransaction: CommitOrDiscard | undefined
        const startValue = dockedSizes[config.key]

        return {
          onDrag(dx, dy) {
            const newValue = clamp(
              startValue + config.getDelta(dx, dy),
              config.min,
              config.max,
            )

            tempTransaction?.discard()
            tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
              stateEditors.studio.historic.dockedLayout.setSize({
                key: config.key,
                value: newValue,
              })
            })
          },
          onDragEnd(dragHappened) {
            if (dragHappened) {
              tempTransaction?.commit()
            } else {
              tempTransaction?.discard()
            }
          },
        }
      },
    }
  }, [edge, config, dockedSizes])

  const [isDragging] = useDrag(node, dragOpts)

  const Comp =
    edge === 'outlineRight'
      ? RightEdge
      : edge === 'detailsLeft'
      ? LeftEdge
      : TopEdge

  return <Comp ref={ref} className={isDragging ? 'isDragging' : ''} />
}

export default DockResizeHandle
