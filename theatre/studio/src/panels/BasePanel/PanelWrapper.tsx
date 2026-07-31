import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import React from 'react'
import styled from 'styled-components'
import {usePanel} from './BasePanel'
import PanelResizers from './PanelResizers'

const Container = styled.div`
  position: absolute;
  user-select: none;
  box-sizing: border-box;
  ${pointerEventsAutoInNormalMode};
  /* box-shadow: 1px 2px 10px -5px black; */

  z-index: 1000;
`

const PanelWrapper = React.forwardRef(
  (
    props: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    > & {docked?: boolean; showResizers?: boolean},
    ref,
  ) => {
    const stuff = usePanel()
    const {
      style,
      children,
      docked = false,
      showResizers = true,
      ...otherProps
    } = props

    return (
      // @ts-ignore
      <Container
        // @ts-ignore
        ref={ref}
        {...otherProps}
        style={
          docked
            ? {
                position: 'relative',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                ...(style ?? {}),
              }
            : {
                width: stuff.dims.width + 'px',
                height: stuff.dims.height + 'px',
                top: stuff.dims.top + 'px',
                left: stuff.dims.left + 'px',
                ...(style ?? {}),
              }
        }
      >
        {showResizers && <PanelResizers />}
        {children}
      </Container>
    )
  },
)

export default PanelWrapper
