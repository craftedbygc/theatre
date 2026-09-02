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
  width: 16px;
  margin: 0 0px 0 2px;
  position: relative;
  z-index: 0;

  &:after {
    position: absolute;
    left: -14px;
    right: -14px;
    top: -2px;
    bottom: -2px;
    content: ' ';
    display: none;
    z-index: -1;
    background: ${transparentize(0.2, 'black')};
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
    color: #e0c917;
  }

  color: ${(props) =>
    props.presence === PresenceFlag.Primary
      ? 'white'
      : props.isOn
      ? nextPrevCursorsTheme.onColor
      : nextPrevCursorsTheme.offColor};
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
`

const Prev = styled(PrevOrNextButton)<{
  available: boolean
  flag: PresenceFlag | undefined
}>`
  ${dimWhenIdle};
  transform: translateX(2px);
  ${Container}:hover & {
    transform: translateX(-7px);
  }
`
const Next = styled(PrevOrNextButton)<{
  available: boolean
  flag: PresenceFlag | undefined
}>`
  ${dimWhenIdle};
  transform: translateX(-2px);
  ${Container}:hover & {
    transform: translateX(7px);
  }
`

const CurDiamond = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  background-color: currentColor;
  ${dimWhenIdle};
`

namespace Icons {
  const Chevron_Group = styled.g`
    stroke-width: 1;
    ${PrevOrNextButton}:hover & path {
      stroke-width: 3;
    }
  `

  export const Prev = () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Chevron_Group transform={`translate(6 3)`}>
        <path d="M4 1L1 4L4 7" stroke="currentColor" />
      </Chevron_Group>
    </svg>
  )

  export const Next = () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <Chevron_Group transform={`translate(1 3)`}>
        <path d="M1 1L4 4L1 7" stroke="currentColor" />
      </Chevron_Group>
    </svg>
  )
}

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
        <Icons.Prev />
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
        >
          <CurDiamond />
        </SavedStateDiamondWrapper>
      </CurButton>
      <Next
        available={!!props.next}
        onClick={props.next?.jump}
        flag={nextPresence.flag}
        {...nextPresence.attrs}
      >
        <Icons.Next />
      </Next>
    </Container>
  )
}

export default NextPrevKeyframeCursors
