import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import React from 'react'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'

const Container = styled.div`
  position: absolute;

  color: white;
  padding: 0;
  margin: 0;
  cursor: default;
  ${pointerEventsAutoInNormalMode};

  color: white;
  box-sizing: border-box;

  border-radius: 4px;
  background-color: var(--studio-popover-bg, #282b2f);
  border: 0.5px solid #565e66;
  z-index: 10000;
  padding: 8px 8px;
  font-size: 10px;

  z-index: 10000;

  & a {
    color: inherit;
  }

  max-width: 240px;
  padding: 8px;
  pointer-events: none !important;
`

const BasicTooltip = React.forwardRef(
  (
    {
      children,
      className,
    }: {
      className?: string
      showPopoverEdgeTriangle?: boolean
      children: React.ReactNode
    },
    ref,
  ) => {
    return (
      <Container className={className} ref={ref as $IntentionalAny}>
        {children}
      </Container>
    )
  },
)

export default BasicTooltip
