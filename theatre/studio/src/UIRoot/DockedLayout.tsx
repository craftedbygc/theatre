import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {isRemoteEditorWindow} from '@unseenco/theatre-studio/remoteEditor'
import {useVal} from '@unseenco/theatre-react'
import React, {useLayoutEffect, useRef} from 'react'
import styled from 'styled-components'
import {useLayoutMode} from './LayoutModeContext'
import {notifyDockedResize} from '@unseenco/theatre-studio/UI/dockedViewport'
import {
  applyDockedPageViewport,
  clearDockedPageViewport,
} from './syncDockedPageViewport'
import {
  resetDockedToolbarHeight,
  setDockedToolbarHeight,
} from './dockedToolbarHeight'
import {DOCKED_PANE_BACKGROUND} from './dockedLayoutConstants'

const Grid = styled.div.attrs<{
  $outlineWidth: number
  $detailsWidth: number
  $sequencerHeight: number
}>(({$outlineWidth, $detailsWidth, $sequencerHeight}) => ({
  style: {
    gridTemplateRows: `auto 1fr ${$sequencerHeight}px`,
    gridTemplateColumns: `${$outlineWidth}px 1fr ${$detailsWidth}px`,
  },
}))`
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-areas:
    'toolbar toolbar toolbar'
    'outline viewport details'
    'sequencer sequencer sequencer';
  pointer-events: none;
`

export const DockedGridArea = {
  toolbar: 'toolbar',
  outline: 'outline',
  viewport: 'viewport',
  details: 'details',
  sequencer: 'sequencer',
} as const

export const DockedToolbarSlot = styled.div`
  grid-area: toolbar;
  ${pointerEventsAutoInNormalMode};
  background: ${DOCKED_PANE_BACKGROUND};
  border-bottom: 1px solid rgba(0, 0, 0, 0.25);
  min-height: 0;
  display: flex;
  align-items: stretch;
`

export const MeasuredDockedToolbarSlot: React.FC<{
  children: React.ReactNode
}> = ({children}) => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const updateHeight = () => {
      setDockedToolbarHeight(el.getBoundingClientRect().height)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)

    return () => {
      observer.disconnect()
      resetDockedToolbarHeight()
    }
  }, [])

  return <DockedToolbarSlot ref={ref}>{children}</DockedToolbarSlot>
}

export const DockedOutlineSlot = styled.div`
  grid-area: outline;
  ${pointerEventsAutoInNormalMode};
  background: ${DOCKED_PANE_BACKGROUND};
  border-right: 1px solid rgba(0, 0, 0, 0.2);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
  padding-top: 4px;
  padding-left: 5px;
  box-sizing: border-box;
`

export const DockedViewportSlot = styled.div`
  grid-area: viewport;
  pointer-events: none;
  min-width: 0;
  min-height: 0;
`

export const DockedDetailsSlot = styled.div`
  grid-area: details;
  ${pointerEventsAutoInNormalMode};
  background: ${DOCKED_PANE_BACKGROUND};
  border-left: 1px solid rgba(0, 0, 0, 0.2);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
`

export const DockedSequencerSlot = styled.div`
  grid-area: sequencer;
  ${pointerEventsAutoInNormalMode};
  background: ${DOCKED_PANE_BACKGROUND};
  border-top: 1px solid rgba(0, 0, 0, 0.25);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
`

const DockedLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {
    viewportInsets,
    viewportWidth,
    viewportHeight,
    outlineWidth,
    detailsWidth,
    sequencerHeight,
    isDocked,
  } = useLayoutMode()
  const visibilityState = useVal(getStudio().atomP.ahistoric.visibilityState)
  const isStudioHidden =
    !isRemoteEditorWindow() && visibilityState === 'everythingIsHidden'

  useLayoutEffect(() => {
    if (!isDocked || isStudioHidden) {
      clearDockedPageViewport()
      notifyDockedResize(null)
      return
    }

    const viewport = {
      top: viewportInsets.top,
      left: viewportInsets.left,
      width: viewportWidth,
      height: viewportHeight,
    }

    applyDockedPageViewport(viewport)
    notifyDockedResize(viewport)

    return () => {
      clearDockedPageViewport()
      notifyDockedResize(null)
    }
  }, [
    isDocked,
    isStudioHidden,
    viewportInsets.top,
    viewportInsets.left,
    viewportWidth,
    viewportHeight,
  ])

  return (
    <Grid
      $outlineWidth={outlineWidth}
      $detailsWidth={detailsWidth}
      $sequencerHeight={sequencerHeight}
    >
      {children}
    </Grid>
  )
}

export default DockedLayout
