import getStudio from '@unseenco/theatre-studio/getStudio'
import {useVal} from '@unseenco/theatre-react'
import type {DockedLayoutSizes} from '@unseenco/theatre-studio/store/types/historic'
import {notifyDockedToggle} from '@unseenco/theatre-studio/UI/dockedViewport'
import React, {useContext, useLayoutEffect, useMemo} from 'react'
import useWindowSize from 'react-use/esm/useWindowSize'
import {
  DEFAULT_DOCKED_DETAILS_WIDTH,
  DEFAULT_DOCKED_OUTLINE_WIDTH,
  DEFAULT_DOCKED_SEQUENCER_HEIGHT,
  DOCKED_TOOLBAR_HEIGHT,
} from './dockedLayoutConstants'
import {dockedToolbarHeightB} from './dockedToolbarHeight'

export type ViewportInsets = {
  top: number
  left: number
  right: number
  bottom: number
}

export type LayoutModeContextValue = {
  mode: 'floating' | 'docked'
  isDocked: boolean
  dockedSizes: Required<DockedLayoutSizes>
  toolbarHeight: number
  viewportInsets: ViewportInsets
  outlineWidth: number
  detailsWidth: number
  sequencerHeight: number
  viewportWidth: number
  viewportHeight: number
}

const LayoutModeContext = React.createContext<LayoutModeContextValue>({
  mode: 'floating',
  isDocked: false,
  dockedSizes: {
    outlineWidth: DEFAULT_DOCKED_OUTLINE_WIDTH,
    detailsWidth: DEFAULT_DOCKED_DETAILS_WIDTH,
    sequencerHeight: DEFAULT_DOCKED_SEQUENCER_HEIGHT,
  },
  toolbarHeight: DOCKED_TOOLBAR_HEIGHT,
  viewportInsets: {top: 0, left: 0, right: 0, bottom: 0},
  outlineWidth: 0,
  detailsWidth: 0,
  sequencerHeight: 0,
  viewportWidth: 0,
  viewportHeight: 0,
})

export const useLayoutMode = () => useContext(LayoutModeContext)

export const LayoutModeProvider: React.FC<{
  children: React.ReactNode
}> = ({children}) => {
  const dockedMode = useVal(getStudio().atomP.historic.dockedMode) ?? false
  const dockedLayout = useVal(getStudio().atomP.historic.dockedLayout)
  const pinOutline = useVal(getStudio().atomP.ahistoric.pinOutline) ?? true
  const pinDetails = useVal(getStudio().atomP.ahistoric.pinDetails) ?? true
  const pinSequenceEditor =
    useVal(getStudio().atomP.ahistoric.pinSequenceEditor) ?? true
  const windowSize = useWindowSize(800, 600)
  const measuredToolbarHeight = useVal(dockedToolbarHeightB.prism)

  const value = useMemo((): LayoutModeContextValue => {
    const dockedSizes: Required<DockedLayoutSizes> = {
      outlineWidth: dockedLayout?.outlineWidth ?? DEFAULT_DOCKED_OUTLINE_WIDTH,
      detailsWidth: dockedLayout?.detailsWidth ?? DEFAULT_DOCKED_DETAILS_WIDTH,
      sequencerHeight:
        dockedLayout?.sequencerHeight ?? DEFAULT_DOCKED_SEQUENCER_HEIGHT,
    }

    const outlineWidth = pinOutline ? dockedSizes.outlineWidth : 0
    const detailsWidth = pinDetails ? dockedSizes.detailsWidth : 0
    const sequencerHeight = pinSequenceEditor ? dockedSizes.sequencerHeight : 0

    const toolbarHeight = dockedMode
      ? measuredToolbarHeight
      : DOCKED_TOOLBAR_HEIGHT

    const viewportInsets: ViewportInsets = {
      top: toolbarHeight,
      left: outlineWidth,
      right: detailsWidth,
      bottom: sequencerHeight,
    }

    const viewportWidth = Math.max(
      0,
      windowSize.width - outlineWidth - detailsWidth,
    )
    const viewportHeight = Math.max(
      0,
      windowSize.height - toolbarHeight - sequencerHeight,
    )

    return {
      mode: dockedMode ? 'docked' : 'floating',
      isDocked: dockedMode,
      dockedSizes,
      toolbarHeight,
      viewportInsets,
      outlineWidth,
      detailsWidth,
      sequencerHeight,
      viewportWidth,
      viewportHeight,
    }
  }, [
    dockedMode,
    dockedLayout,
    pinOutline,
    pinDetails,
    pinSequenceEditor,
    windowSize.width,
    windowSize.height,
    measuredToolbarHeight,
  ])

  useLayoutEffect(() => {
    notifyDockedToggle(dockedMode)
  }, [dockedMode])

  return (
    <LayoutModeContext.Provider value={value}>
      {children}
    </LayoutModeContext.Provider>
  )
}
