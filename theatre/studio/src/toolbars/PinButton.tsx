import styled from 'styled-components'
import type {ComponentPropsWithRef, ReactNode} from 'react'
import React, {forwardRef, useState} from 'react'
import {mergeRefs} from 'react-merge-refs'
import {Container as ToolbarIconButtonContainer} from '@unseenco/theatre-studio/uiComponents/toolbar/ToolbarIconButton'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'

const Container = styled(ToolbarIconButtonContainer)<{pinned?: boolean}>`
  color: ${({pinned}) => (pinned ? 'rgba(255, 255, 255, 0.8)' : '#A8A8A9')};

  background: ${({pinned}) =>
    pinned ? 'var(--studio-accent)' : undefined};

  &:hover {
    background: ${({pinned}) =>
      pinned ? 'var(--studio-accent-hover)' : undefined};
  }

  &:active {
    background: ${({pinned}) =>
      pinned ? 'var(--studio-accent-active)' : undefined};
  }
`

interface PinButtonProps extends ComponentPropsWithRef<'button'> {
  icon: ReactNode
  pinHintIcon: ReactNode
  unpinHintIcon: ReactNode
  hint?: boolean
  pinned?: boolean
  title?: string
}

const PinButton = forwardRef<HTMLButtonElement, PinButtonProps>(
  (
    {children, hint, pinned, icon, pinHintIcon, unpinHintIcon, title, ...props},
    ref,
  ) => {
    const [hovered, setHovered] = useState(false)
    const c = useChordial(() => ({
      title,
      items: [],
    }))

    const showHint = hovered || hint

    return (
      <Container
        {...props}
        pinned={pinned}
        ref={mergeRefs([c.targetRef, ref])}
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
      >
        {/* Necessary for hover to work properly. */}
        <div
          style={{
            pointerEvents: 'none',
            width: 'fit-content',
            height: 'fit-content',
            inset: 0,
          }}
        >
          {showHint && !pinned
            ? pinHintIcon
            : showHint && pinned
            ? unpinHintIcon
            : icon}
        </div>
        {children}
      </Container>
    )
  },
)

export default PinButton
