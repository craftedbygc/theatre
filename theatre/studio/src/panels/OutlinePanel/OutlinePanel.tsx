import React, {useEffect, useLayoutEffect} from 'react'
import styled, {css} from 'styled-components'
import {panelZIndexes} from '@unseenco/theatre-studio/panels/BasePanel/common'
import ProjectsList from './ProjectsList/ProjectsList'
import {useVal} from '@unseenco/theatre-react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import useHotspot from '@unseenco/theatre-studio/uiComponents/useHotspot'
import {Atom, prism, val} from '@unseenco/theatre-dataverse'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'
import DockResizeHandle from '@unseenco/theatre-studio/UIRoot/DockResizeHandle'

const headerHeight = `44px`

const floatingStyles = css`
  position: absolute;
  left: 8px;
  top: calc(${headerHeight} + 8px);
  height: fit-content;
  max-height: calc(100% - ${headerHeight});
`

const dockedStyles = css`
  position: relative;
  left: auto;
  top: auto;
  height: 100%;
  max-height: none;
`

const Container = styled.div<{pin: boolean; $docked: boolean}>`
  ${pointerEventsAutoInNormalMode};
  background-color: transparent;
  z-index: ${panelZIndexes.outlinePanel};

  overflow-y: scroll;
  overflow-x: hidden;
  padding: 0;
  user-select: none;

  &::-webkit-scrollbar {
    display: none;
  }

  scrollbar-width: none;

  ${({$docked}) => ($docked ? dockedStyles : floatingStyles)};

  display: ${({pin}) => (pin ? 'block' : 'none')};

  ${({$docked, pin}) =>
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

  // Create a small buffer on the bottom to aid selecting the bottom item in a long, scrolling list
  &::after {
    content: '';
    display: block;
    height: 20px;
  }
`

const OutlinePanel: React.FC<{}> = () => {
  const pin = useVal(getStudio().atomP.ahistoric.pinOutline) ?? true
  const {isDocked} = useLayoutMode()
  const show = useVal(shouldShowOutlineD)
  const active = useHotspot('left', {disabled: isDocked})

  useLayoutEffect(() => {
    if (isDocked) return
    isOutlinePanelHotspotActiveB.set(active)
  }, [active, isDocked])

  // cleanup
  useEffect(() => {
    return () => {
      isOutlinePanelHoveredB.set(false)
      isOutlinePanelHotspotActiveB.set(false)
    }
  }, [])

  return (
    <Container
      pin={isDocked ? pin : pin || show}
      $docked={isDocked}
      onMouseEnter={() => {
        if (!isDocked) isOutlinePanelHoveredB.set(true)
      }}
      onMouseLeave={() => {
        if (!isDocked) isOutlinePanelHoveredB.set(false)
      }}
    >
      {isDocked && pin && <DockResizeHandle edge="outlineRight" />}
      <ProjectsList />
    </Container>
  )
}

export default OutlinePanel

const isOutlinePanelHotspotActiveB = new Atom<boolean>(false)
const isOutlinePanelHoveredB = new Atom<boolean>(false)

export const shouldShowOutlineD = prism<boolean>(() => {
  const isHovered = val(isOutlinePanelHoveredB.prism)
  const isHotspotActive = val(isOutlinePanelHotspotActiveB.prism)

  return isHovered || isHotspotActive
})
