import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import React from 'react'
import styled from 'styled-components'
import PopoverArrow from './PopoverArrow'

export const popoverBackgroundColor = `var(--studio-popover-bg, #282b2f)`

const Container = styled.div`
  position: absolute;
  --popover-bg: ${popoverBackgroundColor};
  --popover-inner-stroke: #505159;
  --popover-outer-stroke: #565e66;

  border-radius: var(--studio-radius);
  border: 0.5px solid var(--popover-outer-stroke);

  background: var(--popover-bg);

  color: white;
  padding: 4px 8px;
  margin: 0;
  cursor: default;
  ${pointerEventsAutoInNormalMode};
  z-index: 10000;

  & a {
    color: inherit;
  }
`

const BasicPopover: React.FC<{
  className?: string
  showPopoverEdgeTriangle?: boolean
  children: React.ReactNode
}> = React.forwardRef(
  (
    {
      children,
      className,
      showPopoverEdgeTriangle: showPopoverEdgeTriangle = false,
    },
    ref,
  ) => {
    return (
      <Container className={className} ref={ref as $IntentionalAny}>
        {showPopoverEdgeTriangle ? <PopoverArrow /> : undefined}
        {children}
      </Container>
    )
  },
)

export default BasicPopover
