import {theme} from '@unseenco/theatre-studio/css'
import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {zIndexes} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
import {useVal} from '@unseenco/theatre-react'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {darken, transparentize} from 'polished'
import React from 'react'
import styled from 'styled-components'
import FrameGrid from '@unseenco/theatre-studio/panels/SequenceEditorPanel/FrameGrid/FrameGrid'

const Container = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: ${() => zIndexes.rightBackground};
  overflow: hidden;
  background: ${transparentize(0.01, darken(1 * 0.03, theme.panel.bg))};
  pointer-events: none;
`

const DopeSheetBackground: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({layoutP}) => {
  const width = useVal(layoutP.rightDims.width)
  const height = useVal(layoutP.panelDims.height)

  return (
    <Container style={{width: width + 'px'}}>
      <FrameGrid width={width} height={height} layoutP={layoutP} />
    </Container>
  )
}

export default DopeSheetBackground
