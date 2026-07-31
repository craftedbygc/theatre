import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import React from 'react'
import type {
  $FixMe,
  $IntentionalAny,
} from '@unseenco/theatre-shared/utils/types'
import {mergeRefs} from 'react-merge-refs'
import ToolbarSwitchSelectContainer from './ToolbarSwitchSelectContainer'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'

export const Container = styled.button`
  ${pointerEventsAutoInNormalMode};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  width: 32px;
  height: 32px;
  outline: none;

  color: #a8a8a9;

  background: rgba(40, 43, 47, 0.8);
  backdrop-filter: blur(14px);
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 2px;

  svg {
    display: block;
    pointer-events: none;
  }

  &:hover {
    background: rgba(59, 63, 69, 0.8);
  }

  &:active {
    background: rgba(82, 88, 96, 0.8);
  }

  &.selected {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(30, 88, 102, 0.7);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    &:hover {
      background: rgba(30, 88, 102, 0.85);
    }

    &:active {
      background: rgba(30, 88, 102, 0.95);
    }
  }

  ${ToolbarSwitchSelectContainer} > & {
    backdrop-filter: none;
    filter: none;
    border-radius: 0;

    &:first-child {
      border-top-left-radius: 2px;
      border-bottom-left-radius: 2px;
    }

    &:last-child {
      border-bottom-right-radius: 2px;
      border-top-right-radius: 2px;
    }
  }

  @supports not (backdrop-filter: blur()) {
    background: rgba(40, 43, 47, 0.95);
  }
`

const ToolbarIconButton: typeof Container = React.forwardRef(
  ({title, ...props}: $FixMe, ref: $FixMe) => {
    const c = useChordial(() => {
      return {
        title,
        items: [],
      }
    })

    return (
      <>
        <Container ref={mergeRefs([c.targetRef, ref])} {...props} />{' '}
      </>
    )
  },
) as $IntentionalAny

export default ToolbarIconButton
