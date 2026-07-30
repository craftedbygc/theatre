import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import type {MutableRefObject} from 'react'
import {useContext, useEffect} from 'react'
import React from 'react'
import PopoverPositioner from './PopoverPositioner'
import {createPortal} from 'react-dom'
import {useTooltipOpenState} from './TooltipContext'
import {PortalContext} from 'reakit'
import noop from '@unseenco/theatre-shared/utils/noop'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'

/**
 * Useful helper in development to prevent the tooltips from auto-closing,
 * so its easier to inspect the DOM / change the styles, etc.
 *
 * Call window.$disableAutoCloseTooltip() in the console to disable auto-close
 */
const shouldAutoCloseByDefault =
  process.env.NODE_ENV === 'development'
    ? (): boolean =>
        (window as $IntentionalAny).__disableAutoCloseTooltip ?? true
    : (): boolean => true

if (process.env.NODE_ENV === 'development') {
  ;(window as $IntentionalAny).$disableAutoCloseTooltip = () => {
    ;(window as $IntentionalAny).__disableAutoCloseTooltip = false
  }
}

export default function useTooltip<T extends HTMLElement>(
  opts: {
    enabled?: boolean
    enterDelay?: number
    exitDelay?: number
    verticalPlacement?: 'top' | 'bottom' | 'overlay'
    verticalGap?: number
  },
  render: () => React.ReactElement,
): [
  node: React.ReactNode,
  targetRef: MutableRefObject<T | null>,
  isOpen: boolean,
] {
  const enabled = opts.enabled !== false
  const [isOpen, setIsOpen] = useTooltipOpenState()

  const [targetRef, targetNode] = useRefAndState<T | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const target = targetRef.current
    if (!target) return

    const onMouseEnter = () => setIsOpen(true, opts.enterDelay ?? 400)
    const onMouseLeave = () => {
      if (shouldAutoCloseByDefault()) setIsOpen(false, opts.exitDelay ?? 200)
    }

    target.addEventListener('mouseenter', onMouseEnter)
    target.addEventListener('mouseleave', onMouseLeave)

    return () => {
      target.removeEventListener('mouseenter', onMouseEnter)
      target.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [targetRef, enabled, opts.enterDelay, opts.exitDelay])

  const portalLayer = useContext(PortalContext)

  const node =
    enabled && isOpen && targetNode ? (
      createPortal(
        <PopoverPositioner
          children={render}
          target={targetNode}
          onClickOutside={noop}
          verticalPlacement={opts.verticalPlacement}
          verticalGap={opts.verticalGap}
        />,
        portalLayer!,
      )
    ) : (
      <></>
    )

  return [node, targetRef, isOpen]
}
