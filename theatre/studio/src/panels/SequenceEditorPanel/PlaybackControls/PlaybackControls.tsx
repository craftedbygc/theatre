import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import {usePrism} from '@unseenco/theatre-react'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {val} from '@unseenco/theatre-dataverse'
import React from 'react'
import styled, {css} from 'styled-components'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import getStudio from '@unseenco/theatre-studio/getStudio'
import PanelDragZone from '@unseenco/theatre-studio/panels/BasePanel/PanelDragZone'
import Play from '@unseenco/theatre-studio/uiComponents/icons/Play'
import Pause from '@unseenco/theatre-studio/uiComponents/icons/Pause'
import JumpToStart from '@unseenco/theatre-studio/uiComponents/icons/JumpToStart'
import JumpToEnd from '@unseenco/theatre-studio/uiComponents/icons/JumpToEnd'
import StepPrev from '@unseenco/theatre-studio/uiComponents/icons/StepPrev'
import StepNext from '@unseenco/theatre-studio/uiComponents/icons/StepNext'
import Loop from '@unseenco/theatre-studio/uiComponents/icons/Loop'
import Close from '@unseenco/theatre-studio/uiComponents/icons/Close'
import {
  getSequenceLooping,
  jumpToEnd,
  jumpToStart,
  setSequenceLooping,
  stepFrame,
  toggleSequencePlayback,
} from './sequencePlayback'
import {rangeFromZoomLevel, zoomLevelFromRange} from './sequenceZoom'
import {transportStripHeight} from './constants'

export {transportStripHeight}

const stripStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: ${transportStripHeight}px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  z-index: 2;
  background-color: #25272b;
  border-bottom: 1px solid rgb(0 0 0 / 13%);
  ${pointerEventsAutoInNormalMode};
`

const Strip = styled.div`
  ${stripStyles}
`

const StripDrag = styled(PanelDragZone)`
  ${stripStyles}
`

const CloseSlot = styled.div`
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  cursor: default;
`

const ZoomSlot = styled.div`
  position: absolute;
  right: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  width: 110px;
  cursor: default;
`

function stopPanelDrag(event: React.MouseEvent) {
  event.stopPropagation()
}

const ZoomSlider = styled.input`
  ${pointerEventsAutoInNormalMode};
  width: 100%;
  height: 14px;
  margin: 0;
  padding: 0;
  cursor: pointer;
  background: transparent;
  outline: none;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.12);
  }

  &::-moz-range-track {
    height: 3px;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.12);
    border: none;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    margin-top: -3.5px;
    border-radius: 50%;
    border: none;
    background: #a8a8a9;
  }

  &::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
    background: #a8a8a9;
  }

  &:hover::-webkit-slider-thumb,
  &:active::-webkit-slider-thumb {
    background: #d0d0d0;
  }

  &:hover::-moz-range-thumb,
  &:active::-moz-range-thumb {
    background: #d0d0d0;
  }
`

const TransportButton = styled.button`
  ${pointerEventsAutoInNormalMode};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  outline: none;
  border: none;
  border-radius: 2px;
  color: #a8a8a9;
  background: transparent;
  cursor: pointer;

  svg {
    display: block;
    width: 14px;
    height: 14px;
    pointer-events: none;
  }

  &:hover {
    background: rgba(59, 63, 69, 0.8);
    color: #d0d0d0;
  }

  &:active {
    background: rgba(82, 88, 96, 0.8);
  }

  &.selected {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(30, 88, 102, 0.7);

    &:hover {
      background: rgba(30, 88, 102, 0.85);
    }

    &:active {
      background: rgba(30, 88, 102, 0.95);
    }
  }
`

const IconButton: React.FC<{
  title: string
  onClick: () => void
  selected?: boolean
  children: React.ReactNode
}> = ({title, onClick, selected, children}) => {
  const c = useChordial(() => ({
    title,
    items: [],
  }))

  return (
    <TransportButton
      ref={c.targetRef}
      type="button"
      title={title}
      className={selected ? 'selected' : undefined}
      onClick={onClick}
      onMouseDown={stopPanelDrag}
    >
      {children}
    </TransportButton>
  )
}

function closeSequenceEditor() {
  getStudio().transaction(({stateEditors}) => {
    stateEditors.studio.ahistoric.setPinSequenceEditor(false)
  })
}

const PlaybackControls: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  docked?: boolean
}> = ({layoutP, docked = false}) => {
  return usePrism(() => {
    const sheet = val(layoutP.sheet)
    const sequence = getStudioSequence(sheet)
    const playing = val(sequence.pointer.playing)
    const looping = getSequenceLooping(sequence)
    const clippedSpaceRange = val(layoutP.clippedSpace.range)
    const setClippedSpaceRange = val(layoutP.clippedSpace.setRange)
    const zoom = zoomLevelFromRange(
      clippedSpaceRange,
      sequence.length,
      sequence.subUnitsPerUnit,
    )

    const StripComponent = docked ? Strip : StripDrag

    return (
      <StripComponent>
        <CloseSlot onMouseDown={stopPanelDrag}>
          <IconButton title="Close Timeline" onClick={closeSequenceEditor}>
            <Close />
          </IconButton>
        </CloseSlot>
        <IconButton title="Jump to start" onClick={() => jumpToStart(sequence)}>
          <JumpToStart />
        </IconButton>
        <IconButton
          title="Previous frame"
          onClick={() => stepFrame(sequence, -1)}
        >
          <StepPrev />
        </IconButton>
        <IconButton
          title={playing ? 'Pause' : 'Play'}
          onClick={() => toggleSequencePlayback(sequence)}
        >
          {playing ? <Pause /> : <Play />}
        </IconButton>
        <IconButton title="Next frame" onClick={() => stepFrame(sequence, 1)}>
          <StepNext />
        </IconButton>
        <IconButton title="Jump to end" onClick={() => jumpToEnd(sequence)}>
          <JumpToEnd />
        </IconButton>
        <IconButton
          title={looping ? 'Disable loop' : 'Enable loop'}
          selected={looping}
          onClick={() =>
            setSequenceLooping(
              {
                projectId: sheet.address.projectId,
                sheetId: sheet.address.sheetId,
              },
              !looping,
            )
          }
        >
          <Loop />
        </IconButton>
        <ZoomSlot onMouseDown={stopPanelDrag}>
          <ZoomSlider
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={zoom}
            title="Zoom"
            aria-label="Zoom"
            onChange={(e) => {
              setClippedSpaceRange(
                rangeFromZoomLevel(
                  Number(e.target.value),
                  val(layoutP.clippedSpace.range),
                  sequence.length,
                  sequence.subUnitsPerUnit,
                ),
              )
            }}
          />
        </ZoomSlot>
      </StripComponent>
    )
  }, [layoutP, docked])
}

export default PlaybackControls
