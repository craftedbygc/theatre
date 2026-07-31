import {resolveSequenceEditorSheet} from '@unseenco/theatre-studio/selectors'
import {usePrism} from '@unseenco/theatre-react'
import {valToAtom} from '@unseenco/theatre-shared/utils/valToAtom'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {prism, val} from '@unseenco/theatre-dataverse'
import React, {useState} from 'react'
import styled from 'styled-components'

import DopeSheet from './DopeSheet/DopeSheet'
import GraphEditor from './GraphEditor/GraphEditor'
import type {PanelDims, SequenceEditorPanelLayout} from './layout/layout'
import {sequenceEditorPanelLayout} from './layout/layout'
import RightOverlay from './RightOverlay/RightOverlay'
import BasePanel, {
  usePanel,
} from '@unseenco/theatre-studio/panels/BasePanel/BasePanel'
import type {PanelPosition} from '@unseenco/theatre-studio/store/types'
import PanelDragZone from '@unseenco/theatre-studio/panels/BasePanel/PanelDragZone'
import PanelWrapper from '@unseenco/theatre-studio/panels/BasePanel/PanelWrapper'
import FrameStampPositionProvider from './FrameStampPositionProvider'
import GraphEditorToggle from './GraphEditorToggle'
import {
  panelZIndexes,
  TitleBar,
  TitleBar_Piece,
  TitleBar_Punctuation,
} from '@unseenco/theatre-studio/panels/BasePanel/common'
import type {UIPanelId} from '@unseenco/theatre-shared/utils/ids'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import {usePresenceListenersOnRootElement} from '@unseenco/theatre-studio/uiComponents/usePresence'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'
import DockResizeHandle from '@unseenco/theatre-studio/UIRoot/DockResizeHandle'
import {DOCKED_PANE_BACKGROUND} from '@unseenco/theatre-studio/UIRoot/dockedLayoutConstants'

const Container = styled(PanelWrapper)<{$docked?: boolean}>`
  z-index: ${panelZIndexes.sequenceEditorPanel};
  box-shadow: ${({$docked}) =>
    $docked ? 'none' : '2px 2px 0 rgb(0 0 0 / 11%)'};
`

const LeftBackground = styled.div<{$docked?: boolean}>`
  background-color: ${({$docked}) =>
    $docked ? DOCKED_PANE_BACKGROUND : 'rgba(40, 43, 47, 0.99)'};
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
`

export const zIndexes = (() => {
  const s = {
    rightBackground: 0,
    scrollableArea: 0,
    rightOverlay: 0,
    lengthIndicatorCover: 0,
    lengthIndicatorStrip: 0,
    playhead: 0,
    currentFrameStamp: 0,
    marker: 0,
    horizontalScrollbar: 0,
  }

  // sort the z-indexes
  let i = -1
  for (const key of Object.keys(s)) {
    s[key] = i
    i++
  }

  return s
})()

const Header_Container = styled(PanelDragZone)`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
`

const Header_Container_Static = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
`

const defaultPosition: PanelPosition = {
  edges: {
    left: {from: 'screenLeft', distance: 0.1},
    right: {from: 'screenRight', distance: 0.2},
    top: {from: 'screenBottom', distance: 0.4},
    bottom: {from: 'screenBottom', distance: 0.01},
  },
}

const minDims = {width: 800, height: 200}

const SequenceEditorPanel: React.VFC<{}> = (props) => {
  const {isDocked, sequencerHeight, viewportWidth} = useLayoutMode()

  const overrideDims = isDocked
    ? {
        width:
          typeof window !== 'undefined' ? window.innerWidth : viewportWidth,
        height: sequencerHeight,
        left: 0,
        top: 0,
      }
    : undefined

  return (
    <BasePanel
      panelId={'sequenceEditor' as UIPanelId}
      defaultPosition={defaultPosition}
      minDims={minDims}
      overrideDims={overrideDims}
    >
      <Content />
    </BasePanel>
  )
}

const Content: React.VFC<{}> = () => {
  const {dims} = usePanel()
  const {isDocked, sequencerHeight} = useLayoutMode()
  const [containerNode, setContainerNode] = useState<null | HTMLDivElement>(
    null,
  )
  usePresenceListenersOnRootElement(containerNode)

  return usePrism(() => {
    const panelSize = prism.memo(
      'panelSize',
      (): PanelDims => {
        if (isDocked) {
          const width =
            typeof window !== 'undefined' ? window.innerWidth : dims.width
          const height = sequencerHeight
          const screenY =
            typeof window !== 'undefined'
              ? window.innerHeight - height
              : dims.top

          return {
            width,
            height,
            widthWithoutBorder: width - 2,
            heightWithoutBorder: height - 4,
            screenX: 0,
            screenY,
          }
        }

        return {
          width: dims.width,
          height: dims.height,
          widthWithoutBorder: dims.width - 2,
          heightWithoutBorder: dims.height - 4,
          screenX: dims.left,
          screenY: dims.top,
        }
      },
      [dims, isDocked, sequencerHeight],
    )

    const sheet = resolveSequenceEditorSheet({
      fallbackToProjectSheet: isDocked,
    })

    if (!sheet) return <></>

    const panelSizeP = valToAtom('panelSizeP', panelSize).pointer

    // We make a unique key based on the sheet's address, so that
    // <Left /> and <Right />
    // don't have to listen to changes in sheet
    const key = prism.memo('key', () => JSON.stringify(sheet.address), [sheet])

    const layoutP = prism
      .memo(
        'layout',
        () => {
          return sequenceEditorPanelLayout(sheet, panelSizeP)
        },
        [sheet, panelSizeP],
      )
      .getValue()

    const hasSequenceContent = val(layoutP.tree.children).length > 0
    if (!isDocked && !hasSequenceContent) return <></>

    const containerRef = prism.memo(
      'containerRef',
      preventHorizontalWheelEvents,
      [],
    )

    const graphEditorAvailable = val(layoutP.graphEditorDims.isAvailable)
    const graphEditorOpen = val(layoutP.graphEditorDims.isOpen)

    return (
      <Container
        docked={isDocked}
        showResizers={!isDocked}
        $docked={isDocked}
        ref={(elt) => {
          containerRef(elt as HTMLDivElement)
          if (elt !== containerNode) {
            setContainerNode(elt as HTMLDivElement)
          }
        }}
      >
        {isDocked && <DockResizeHandle edge="sequencerTop" />}
        <LeftBackground
          $docked={isDocked}
          style={{width: `${val(layoutP.leftDims.width)}px`}}
        />
        <FrameStampPositionProvider layoutP={layoutP}>
          <Header layoutP={layoutP} docked={isDocked} />
          <DopeSheet key={key + '-dopeSheet'} layoutP={layoutP} />
          {graphEditorOpen && (
            <GraphEditor key={key + '-graphEditor'} layoutP={layoutP} />
          )}
          {graphEditorAvailable && <GraphEditorToggle layoutP={layoutP} />}
          <RightOverlay layoutP={layoutP} />
        </FrameStampPositionProvider>
      </Container>
    )
  }, [dims, containerNode, isDocked, sequencerHeight])
}

const Header: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  docked?: boolean
}> = ({layoutP, docked = false}) => {
  return usePrism(() => {
    const sheet = val(layoutP.sheet)
    const activeVariant = getStudioActiveSequenceVariant(sheet.address)
    const titleBar = (
      <TitleBar>
        <TitleBar_Piece>{sheet.address.sheetId} </TitleBar_Piece>

        <TitleBar_Punctuation>{':'}&nbsp;</TitleBar_Punctuation>
        <TitleBar_Piece>{activeVariant} </TitleBar_Piece>

        <TitleBar_Punctuation>&nbsp;{'>'}&nbsp;</TitleBar_Punctuation>
        <TitleBar_Piece>Sequence</TitleBar_Piece>
      </TitleBar>
    )

    if (docked) {
      return (
        <Header_Container_Static
          style={{
            width: val(layoutP.leftDims.width),
          }}
        >
          {titleBar}
        </Header_Container_Static>
      )
    }

    return (
      <Header_Container
        style={{
          width: val(layoutP.leftDims.width),
        }}
      >
        {titleBar}
      </Header_Container>
    )
  }, [layoutP, docked])
}

export default SequenceEditorPanel

const preventHorizontalWheelEvents = () => {
  let lastNode: null | HTMLElement = null
  const listenerOptions = {
    passive: false,
    capture: false,
  }

  const receiveWheelEvent = (event: WheelEvent) => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (node: HTMLElement | null) => {
    if (lastNode !== node && lastNode) {
      lastNode.removeEventListener('wheel', receiveWheelEvent, listenerOptions)
    }
    lastNode = node
    if (node) {
      node.addEventListener('wheel', receiveWheelEvent, listenerOptions)
    }
  }
}
