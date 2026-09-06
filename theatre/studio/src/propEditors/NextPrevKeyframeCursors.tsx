import type {Keyframe} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {StudioSheetItemKey} from '@unseenco/theatre-shared/utils/ids'
import type {VoidFn} from '@unseenco/theatre-shared/utils/types'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import {transparentize} from 'polished'
import React from 'react'
import styled, {css} from 'styled-components'
import {PresenceFlag} from '@unseenco/theatre-studio/uiComponents/usePresence'
import usePresence from '@unseenco/theatre-studio/uiComponents/usePresence'
import SavedStateDiamondWrapper from './SavedStateDiamondWrapper'
import {ChevronNextSvg, ChevronPrevSvg} from './propIndicatorIcons'

export type NearbyKeyframesControls = {
  prev?: Pick<Keyframe, 'position'> & {
    jump: VoidFn
    itemKey: StudioSheetItemKey
  }
  cur:
    | {type: 'on'; toggle: VoidFn; itemKey: StudioSheetItemKey}
    | {type: 'off'; toggle: VoidFn}
  next?: Pick<Keyframe, 'position'> & {
    jump: VoidFn
    itemKey: StudioSheetItemKey
  }
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  /* Keep the same footprint as DefaultValueIndicator so sequenced chips
     don't steal width from the prop chip when prev/next chevrons are present. */
  width: 16px;
  min-width: 16px;
  max-width: 16px;
  flex: 0 0 16px;
  height: 12px;
  margin: 0 0 0 2px;
  position: relative;
  overflow: visible;
  z-index: 0;

  &:after {
    position: absolute;
    /* Cover expanded chevrons on hover, with a little padding past the tips */
    left: -12px;
    right: -12px;
    /* Optical icon center is ~1px below geometric mid (SVG content at y=7/12) */
    top: -1px;
    height: 16px;
    border-radius: 2px;
    content: ' ';
    display: none;
    z-index: -1;
    background: ${transparentize(0.2, 'black')};
    pointer-events: none;
  }

  &:hover {
    &:after {
      display: block;
    }
  }
`

const dimWhenIdle = css`
  ${Container}:not(:hover) & {
    opacity: 0.7;
  }
`

const Button = styled.div`
  background: none;
  position: relative;
  border: 0;
  transition: transform 0.1s ease-out;
  z-index: 0;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;

  &:after {
    display: none;
    ${Container}:hover & {
      display: block;
    }
    position: absolute;
    left: -4px;
    right: -4px;
    top: -4px;
    bottom: -4px;
    content: ' ';
    z-index: -1;
  }
`

export const nextPrevCursorsTheme = {
  offColor: '#555',
  /** Visible even on the dark detail pane when there is no keyframe yet */
  offDiamondColor: '#8a8a8a',
  offDiamondHoverColor: '#b0b0b0',
  onColor: '#e0c917',
}

const CurButton = styled(Button)<{
  isOn: boolean
  presence: PresenceFlag | undefined
}>`
  width: 8px;
  height: 12px;
  flex-shrink: 0;

  &:hover {
    color: ${(props) =>
      props.isOn
        ? nextPrevCursorsTheme.onColor
        : nextPrevCursorsTheme.offDiamondHoverColor};
  }

  color: ${(props) =>
    props.presence === PresenceFlag.Primary
      ? 'white'
      : props.isOn
      ? nextPrevCursorsTheme.onColor
      : nextPrevCursorsTheme.offDiamondColor};

  /* Dim only the inner diamond so the saved-state outline stays full strength */
  ${Container}:not(:hover) & [data-diamond-inner] {
    opacity: 0.7;
  }
`

const pointerEventsNone = css`
  pointer-events: none !important;
`

const PrevOrNextButton = styled(Button)<{
  available: boolean
  flag: PresenceFlag | undefined
}>`
  color: ${(props) =>
    props.flag === PresenceFlag.Primary
      ? 'white'
      : props.available
      ? nextPrevCursorsTheme.onColor
      : nextPrevCursorsTheme.offColor};

  ${(props) =>
    props.available ? pointerEventsAutoInNormalMode : pointerEventsNone};

  &:hover svg path {
    stroke-width: 3;
  }
`

const Prev = styled(PrevOrNextButton)<{
  available: boolean
  flag: PresenceFlag | undefined
}>`
  ${dimWhenIdle};
  position: absolute;
  left: 0;
  top: 50%;
  /* 1px further out than the previous 2px / -2px idle tuck */
  transform: translate(-1px, -50%);
  ${Container}:hover & {
    transform: translate(-8px, -50%);
  }
`
const Next = styled(PrevOrNextButton)<{
  available: boolean
  flag: PresenceFlag | undefined
}>`
  ${dimWhenIdle};
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(1px, -50%);
  ${Container}:hover & {
    transform: translate(8px, -50%);
  }
`

const NextPrevKeyframeCursors: React.VFC<
  NearbyKeyframesControls & {
    hasDivergedFromSavedState?: boolean
  }
> = (props) => {
  const prevPresence = usePresence(props.prev?.itemKey)
  const curPresence = usePresence(
    props.cur?.type === 'on' ? props.cur.itemKey : undefined,
  )
  const nextPresence = usePresence(props.next?.itemKey)

  return (
    <Container>
      <Prev
        available={!!props.prev}
        onClick={props.prev?.jump}
        flag={prevPresence.flag}
        {...prevPresence.attrs}
      >
        <ChevronPrevSvg />
      </Prev>
      <CurButton
        isOn={props.cur.type === 'on'}
        onClick={props.cur.toggle}
        presence={curPresence.flag}
        {...curPresence.attrs}
      >
        <SavedStateDiamondWrapper
          hasDivergedFromSavedState={props.hasDivergedFromSavedState ?? false}
          layout="sequenced"
        />
      </CurButton>
      <Next
        available={!!props.next}
        onClick={props.next?.jump}
        flag={nextPresence.flag}
        {...nextPresence.attrs}
      >
        <ChevronNextSvg />
      </Next>
    </Container>
  )
}

export default NextPrevKeyframeCursors
