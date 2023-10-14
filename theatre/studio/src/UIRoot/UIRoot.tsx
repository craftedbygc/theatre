import getStudio from '@unseenco/theatre-studio/getStudio'
import {isRemoteEditorWindow} from '@unseenco/theatre-studio/remoteEditor'
import {usePrism, useVal} from '@unseenco/theatre-react'
import {val} from '@unseenco/theatre-dataverse'
import React, {useEffect} from 'react'
import styled, {createGlobalStyle} from 'styled-components'
import PanelsRoot from './PanelsRoot'
import GlobalToolbar from '@unseenco/theatre-studio/toolbars/GlobalToolbar'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import {PortalContext} from 'reakit'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import useKeyboardShortcuts from './useKeyboardShortcuts'
import PointerEventsHandler from '@unseenco/theatre-studio/uiComponents/PointerEventsHandler'
import {MountAll} from '@unseenco/theatre-studio/utils/renderInPortalInContext'
import {PortalLayer, ProvideStyles} from '@unseenco/theatre-studio/css'
import {
  createTheatreInternalLogger,
  TheatreLoggerLevel,
} from '@unseenco/theatre-shared/logger'
import {ProvideLogger} from '@unseenco/theatre-studio/uiComponents/useLogger'
import {Notifier} from '@unseenco/theatre-studio/notify'
import {useChordialCaptureEvents} from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'
import {ChordialOverlay} from '@unseenco/theatre-studio/uiComponents/chordial/ChordialOverlay'

const MakeRootHostContainStatic =
  typeof window !== 'undefined'
    ? createGlobalStyle`
  :host {
    contain: strict;
  }
`
    : ({} as ReturnType<typeof createGlobalStyle>)

const Container = styled(PointerEventsHandler)`
  z-index: 50;
  position: fixed;
  inset: 0;

  &.invisible {
    pointer-events: none !important;
    opacity: 0;
    transform: translateX(1000000px);
  }
`

const INTERNAL_LOGGING = /Playground.+Theatre\.js/.test(
  (typeof document !== 'undefined' ? document?.title : null) ?? '',
)

export default function UIRoot(props: {
  containerShadow: ShadowRoot & HTMLElement
}) {
  const studio = getStudio()
  const [portalLayerRef, portalLayer] = useRefAndState<HTMLDivElement>(
    undefined as $IntentionalAny,
  )

  const uiRootLogger = createTheatreInternalLogger()
  uiRootLogger.configureLogging({
    min: TheatreLoggerLevel.DEBUG,
    dev: INTERNAL_LOGGING,
    internal: INTERNAL_LOGGING,
  })
  const logger = uiRootLogger.getLogger().named('Theatre.js UIRoot')

  useKeyboardShortcuts()

  const visiblityState = useVal(studio.atomP.ahistoric.visibilityState)
  useEffect(() => {
    if (!isRemoteEditorWindow() && visiblityState === 'everythingIsHidden') {
      console.warn(
        `Theatre.js Studio is hidden. Use the keyboard shortcut 'alt + \\' to restore the studio, or call studio.ui.restore().`,
      )
    }
    return () => {}
  }, [visiblityState])

  const chordialRootRef = useChordialCaptureEvents()

  const inside = usePrism(() => {
    const visiblityState = val(studio.atomP.ahistoric.visibilityState)
    const isStudioHidden =
      !isRemoteEditorWindow() && visiblityState === 'everythingIsHidden'

    const initialised = val(studio.atomP.ephemeral.initialised)

    return !initialised ? null : (
      <ProvideLogger logger={logger}>
        <MountExtensionComponents />
        <PortalContext.Provider value={portalLayer}>
          <ProvideStyles
            target={
              window.__IS_VISUAL_REGRESSION_TESTING === true
                ? undefined
                : props.containerShadow
            }
          >
            <>
              <MakeRootHostContainStatic />
              <Container
                className={isStudioHidden ? 'invisible' : ''}
                // @ts-ignore
                ref={chordialRootRef}
              >
                <PortalLayer ref={portalLayerRef} />
                <ChordialOverlay />
                <GlobalToolbar />
                <PanelsRoot />
                <Notifier />
              </Container>
            </>
          </ProvideStyles>
        </PortalContext.Provider>
      </ProvideLogger>
    )
  }, [studio, portalLayerRef, portalLayer])

  return inside
}

const MountExtensionComponents: React.FC<{}> = () => {
  return <MountAll />
}
