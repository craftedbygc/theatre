import {getOutlineSelection} from '@unseenco/theatre-studio/selectors'
import {usePrism, useVal} from '@unseenco/theatre-react'
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import styled, {css} from 'styled-components'
import {isProject, isSheetObject} from '@unseenco/theatre-shared/instanceTypes'
import {
  panelZIndexes,
  TitleBar_Piece,
  TitleBar_Punctuation,
} from '@unseenco/theatre-studio/panels/BasePanel/common'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import ObjectDetails from './ObjectDetails'
import ProjectDetails from './ProjectDetails'
import getStudio from '@unseenco/theatre-studio/getStudio'
import useHotspot from '@unseenco/theatre-studio/uiComponents/useHotspot'
import {Atom, prism, val} from '@unseenco/theatre-dataverse'
import EmptyState from './EmptyState'
import useLockSet from '@unseenco/theatre-studio/uiComponents/useLockSet'
import {usePresenceListenersOnRootElement} from '@unseenco/theatre-studio/uiComponents/usePresence'
import BasePanel, {
  usePanel,
} from '@unseenco/theatre-studio/panels/BasePanel/BasePanel'
import PanelResizeHandle from '@unseenco/theatre-studio/panels/BasePanel/PanelResizeHandle'
import type {UIPanelId} from '@unseenco/theatre-shared/utils/ids'
import type {PanelPosition} from '@unseenco/theatre-studio/store/types'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'
import DockResizeHandle from '@unseenco/theatre-studio/UIRoot/DockResizeHandle'

const headerHeight = `32px`

const defaultDetailPanelWidth = 350
const defaultDetailPanelGutter = 8
const defaultDetailPanelTop = 50

const defaultPosition: PanelPosition = {
  edges: {
    left: {
      from: 'screenRight',
      distance:
        (defaultDetailPanelGutter + defaultDetailPanelWidth) /
        (typeof window !== 'undefined' ? window.innerWidth : 1920),
    },
    right: {
      from: 'screenRight',
      distance:
        defaultDetailPanelGutter /
        (typeof window !== 'undefined' ? window.innerWidth : 1920),
    },
    top: {
      from: 'screenTop',
      distance:
        defaultDetailPanelTop /
        (typeof window !== 'undefined' ? window.innerHeight : 1080),
    },
    bottom: {
      from: 'screenTop',
      distance:
        (defaultDetailPanelTop + 350) /
        (typeof window !== 'undefined' ? window.innerHeight : 1080),
    },
  },
}

const minDims = {width: 280, height: 200}

const Container = styled.div<{pin: boolean; $docked: boolean}>`
  ${pointerEventsAutoInNormalMode};
  background-color: ${({$docked}) =>
    $docked ? 'transparent' : 'rgba(40, 43, 47, 0.8)'};
  position: ${({$docked}) => ($docked ? 'relative' : 'absolute')};
  height: ${({$docked}) => ($docked ? '100%' : 'fit-content')};
  z-index: ${panelZIndexes.propsPanel};

  box-shadow: ${({$docked}) =>
    $docked
      ? 'none'
      : '0 1px 1px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15)'};
  backdrop-filter: ${({$docked}) => ($docked ? 'none' : 'blur(14px)')};
  border-radius: ${({$docked}) => ($docked ? '0' : '2px')};

  display: ${({pin}) => (pin ? 'block' : 'none')};

  ${({$docked}) =>
    !$docked &&
    css`
      &:hover {
        display: block;
      }
    `};

  ${({$docked, pin}) =>
    $docked &&
    !pin &&
    css`
      display: none !important;
    `};

  @supports not (backdrop-filter: blur()) {
    background: ${({$docked}) =>
      $docked ? 'transparent' : 'rgba(40, 43, 47, 0.95)'};
  }
`

const Title = styled.div`
  margin: 0 10px;
  color: #919191;
  font-weight: 500;
  font-size: 10px;
  user-select: none;
  ${pointerEventsAutoInNormalMode};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Header = styled.div`
  height: ${headerHeight};
  display: flex;
  align-items: center;
`

const Body = styled.div<{$docked: boolean}>`
  ${pointerEventsAutoInNormalMode};
  max-height: ${({$docked}) => ($docked ? 'none' : 'calc(100vh - 100px)')};
  height: ${({$docked}) => ($docked ? 'calc(100% - 32px)' : 'auto')};
  overflow-y: scroll;
  &::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;
  padding: 0;
  user-select: none;

  /* Set the font-size for input values in the detail panel */
  font-size: 12px;
`

export const contextMenuShownContext = createContext<
  ReturnType<typeof useLockSet>
>([false, () => () => {}])

const DetailPanelContent: React.FC<{}> = () => {
  const {dims} = usePanel()
  const {isDocked, detailsWidth, viewportHeight} = useLayoutMode()
  const pin = useVal(getStudio().atomP.ahistoric.pinDetails) !== false

  const hotspotActive = useHotspot('right', {disabled: isDocked})

  useLayoutEffect(() => {
    if (isDocked) return
    isDetailPanelHotspotActiveB.set(hotspotActive)
  }, [hotspotActive, isDocked])

  // cleanup
  useEffect(() => {
    return () => {
      isDetailPanelHoveredB.set(false)
      isDetailPanelHotspotActiveB.set(false)
    }
  }, [])

  const [isContextMenuShown] = useContext(contextMenuShownContext)

  const showDetailsPanel = isDocked
    ? pin
    : pin || hotspotActive || isContextMenuShown

  const [containerElt, setContainerElt] = useState<null | HTMLDivElement>(null)
  usePresenceListenersOnRootElement(containerElt)

  const panelWidth = isDocked ? detailsWidth : dims.width
  const containerStyle = isDocked
    ? {width: '100%', height: '100%'}
    : {
        right: '12px',
        top: '52px',
        width: panelWidth + 'px',
      }

  const resizeHandle = isDocked ? (
    <DockResizeHandle edge="detailsLeft" />
  ) : (
    <PanelResizeHandle which="Left" />
  )

  return usePrism(() => {
    const selection = getOutlineSelection()
    const obj = selection.find(isSheetObject)

    if (obj) {
      const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)
      return (
        <Container
          data-testid="DetailPanel-Object"
          pin={showDetailsPanel}
          $docked={isDocked}
          ref={setContainerElt}
          style={containerStyle}
          onMouseEnter={() => {
            if (!isDocked) isDetailPanelHoveredB.set(true)
          }}
          onMouseLeave={() => {
            if (!isDocked) isDetailPanelHoveredB.set(false)
          }}
        >
          {resizeHandle}
          <Header>
            <Title
              title={`${obj.sheet.address.sheetId}: ${activeVariant} > ${obj.address.objectKey}`}
            >
              <TitleBar_Piece>{obj.sheet.address.sheetId} </TitleBar_Piece>

              <TitleBar_Punctuation>{':'}&nbsp;</TitleBar_Punctuation>
              <TitleBar_Piece>{activeVariant} </TitleBar_Piece>

              <TitleBar_Punctuation>&nbsp;&rarr;&nbsp;</TitleBar_Punctuation>
              <TitleBar_Piece>{obj.address.objectKey}</TitleBar_Piece>
            </Title>
          </Header>
          <Body $docked={isDocked}>
            <ObjectDetails objects={[obj]} />
          </Body>
        </Container>
      )
    }
    const project = selection.find(isProject)
    if (project) {
      return (
        <Container
          pin={showDetailsPanel}
          $docked={isDocked}
          style={containerStyle}
        >
          {resizeHandle}
          <Header>
            <Title title={`${project.address.projectId}`}>
              <TitleBar_Piece>{project.address.projectId} </TitleBar_Piece>
            </Title>
          </Header>
          <Body $docked={isDocked}>
            <ProjectDetails projects={[project]} />
          </Body>
        </Container>
      )
    }

    return (
      <Container
        pin={showDetailsPanel}
        $docked={isDocked}
        style={containerStyle}
        onMouseEnter={() => {
          if (!isDocked) isDetailPanelHoveredB.set(true)
        }}
        onMouseLeave={() => {
          if (!isDocked) isDetailPanelHoveredB.set(false)
        }}
      >
        {resizeHandle}
        <EmptyState />
      </Container>
    )
  }, [
    showDetailsPanel,
    dims,
    isDocked,
    detailsWidth,
    viewportHeight,
    containerElt,
  ])
}

export default () => {
  const lockSet = useLockSet()
  const {isDocked, detailsWidth, viewportHeight} = useLayoutMode()

  const overrideDims = isDocked
    ? {
        width: detailsWidth,
        height: viewportHeight,
        left: 0,
        top: 0,
      }
    : undefined

  return (
    <contextMenuShownContext.Provider value={lockSet}>
      <BasePanel
        panelId={'detailPanel' as UIPanelId}
        defaultPosition={defaultPosition}
        minDims={minDims}
        overrideDims={overrideDims}
      >
        <DetailPanelContent />
      </BasePanel>
    </contextMenuShownContext.Provider>
  )
}

const isDetailPanelHotspotActiveB = new Atom<boolean>(false)
const isDetailPanelHoveredB = new Atom<boolean>(false)

export const shouldShowDetailD = prism<boolean>(() => {
  const isHovered = val(isDetailPanelHoveredB.prism)
  const isHotspotActive = val(isDetailPanelHotspotActiveB.prism)

  return isHovered || isHotspotActive
})
