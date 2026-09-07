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

  background: var(--studio-panel-bg, #282b2f);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius);

  svg {
    display: block;
    pointer-events: none;
  }

  &:hover {
    background: #3b3f45;
    border-color: var(--studio-border-hover);
  }

  &:active {
    background: #525860;
  }

  &.selected {
    color: rgba(255, 255, 255, 0.8);
    background: #1e5866;
    border-color: var(--studio-border);

    &:hover {
      background: #246a7a;
      border-color: var(--studio-border-hover);
    }

    &:active {
      background: #2a7a8c;
    }
  }

  ${ToolbarSwitchSelectContainer} > & {
    filter: none;
    border-radius: 0;

    &:first-child {
      border-top-left-radius: var(--studio-radius);
      border-bottom-left-radius: var(--studio-radius);
    }

    &:last-child {
      border-bottom-right-radius: var(--studio-radius);
      border-top-right-radius: var(--studio-radius);
    }
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
