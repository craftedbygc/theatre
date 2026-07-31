import {prism, val} from '@unseenco/theatre-dataverse'
import {usePrism} from '@unseenco/theatre-react'
import type {UIPanelId} from '@unseenco/theatre-shared/utils/ids'
import type {
  $IntentionalAny,
  VoidFn,
} from '@unseenco/theatre-shared/utils/types'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {PanelPosition} from '@unseenco/theatre-studio/store/types'
import useLockSet from '@unseenco/theatre-studio/uiComponents/useLockSet'
import React, {useContext} from 'react'
import useWindowSize from 'react-use/esm/useWindowSize'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'

type PanelStuff = {
  panelId: UIPanelId
  dims: {
    width: number
    height: number
    top: number
    left: number
  }
  minDims: {
    width: number
    height: number
  }
  boundsHighlighted: boolean
  addBoundsHighlightLock: () => VoidFn
}

export const panelDimsToPanelPosition = (
  dims: PanelStuff['dims'],
  windowDims: {height: number; width: number},
): PanelPosition => {
  const left = dims.left / windowDims.width
  const right = (dims.left + dims.width) / windowDims.width
  const top = dims.top / windowDims.height
  const bottom = (dims.height + dims.top) / windowDims.height

  const position: PanelPosition = {
    edges: {
      left:
        left <= 0.5
          ? {from: 'screenLeft', distance: left}
          : {from: 'screenRight', distance: 1 - left},

      right:
        right <= 0.5
          ? {from: 'screenLeft', distance: right}
          : {from: 'screenRight', distance: 1 - right},

      top:
        top <= 0.5
          ? {from: 'screenTop', distance: top}
          : {from: 'screenBottom', distance: 1 - top},

      bottom:
        bottom <= 0.5
          ? {from: 'screenTop', distance: bottom}
          : {from: 'screenBottom', distance: 1 - bottom},
    },
  }

  return position
}

const PanelContext = React.createContext<PanelStuff>(null as $IntentionalAny)

export const usePanel = () => useContext(PanelContext)

const BasePanel: React.FC<{
  panelId: UIPanelId
  defaultPosition: PanelPosition
  minDims: {width: number; height: number}
  overrideDims?: PanelStuff['dims']
  children: React.ReactNode
}> = ({panelId, children, defaultPosition, minDims, overrideDims}) => {
  const windowSize = useWindowSize(800, 200)
  const [boundsHighlighted, addBoundsHighlightLock] = useLockSet()
  const {isDocked, viewportInsets} = useLayoutMode()

  const clampDimsToViewport = (
    dims: PanelStuff['dims'],
  ): PanelStuff['dims'] => {
    if (!isDocked) return dims

    const minLeft = viewportInsets.left
    const minTop = viewportInsets.top
    const maxRight = windowSize.width - viewportInsets.right
    const maxBottom = windowSize.height - viewportInsets.bottom

    const left = Math.max(dims.left, minLeft)
    const top = Math.max(dims.top, minTop)
    const width = Math.min(dims.width, maxRight - left)
    const height = Math.min(dims.height, maxBottom - top)

    return {left, top, width, height}
  }

  const {stuff} = usePrism(() => {
    if (overrideDims) {
      const stuff: PanelStuff = {
        dims: overrideDims,
        panelId,
        minDims,
        boundsHighlighted,
        addBoundsHighlightLock,
      }
      return {stuff}
    }

    const {edges} =
      val(getStudio()!.atomP.historic.panelPositions[panelId]) ??
      defaultPosition

    const left = Math.floor(
      windowSize.width *
        (edges.left.from === 'screenLeft'
          ? edges.left.distance
          : 1 - edges.left.distance),
    )

    const right = Math.floor(
      windowSize.width *
        (edges.right.from === 'screenLeft'
          ? edges.right.distance
          : 1 - edges.right.distance),
    )

    const top = Math.floor(
      windowSize.height *
        (edges.top.from === 'screenTop'
          ? edges.top.distance
          : 1 - edges.top.distance),
    )

    const bottom = Math.floor(
      windowSize.height *
        (edges.bottom.from === 'screenTop'
          ? edges.bottom.distance
          : 1 - edges.bottom.distance),
    )

    const width = Math.max(right - left, minDims.width)
    const height = Math.max(bottom - top, minDims.height)

    // memo-ing dims so its ref can be used as a cache key
    const dims = prism.memo(
      'dims',
      () =>
        clampDimsToViewport({
          width,
          left,
          top,
          height,
        }),
      [width, left, top, height, isDocked, viewportInsets],
    )

    const stuff: PanelStuff = {
      dims: dims,
      panelId,
      minDims,
      boundsHighlighted,
      addBoundsHighlightLock,
    }
    return {stuff}
  }, [
    panelId,
    windowSize,
    boundsHighlighted,
    addBoundsHighlightLock,
    overrideDims,
    isDocked,
    viewportInsets,
  ])

  return <PanelContext.Provider value={stuff}>{children}</PanelContext.Provider>
}

export default BasePanel
