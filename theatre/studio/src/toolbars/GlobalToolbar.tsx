import {usePrism, useVal} from '@unseenco/theatre-react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import React from 'react'
import styled, {css} from 'styled-components'
import type {$IntentionalAny} from '@unseenco/theatre-dataverse/dist/types'
import useTooltip from '@unseenco/theatre-studio/uiComponents/Popover/useTooltip'
import ErrorTooltip from '@unseenco/theatre-studio/uiComponents/Popover/ErrorTooltip'
import BasicTooltip from '@unseenco/theatre-studio/uiComponents/Popover/BasicTooltip'
import {val} from '@unseenco/theatre-dataverse'
import ExtensionToolbar from './ExtensionToolbar/ExtensionToolbar'
import PinButton from './PinButton'
import {
  Details,
  Outline,
  Bell,
} from '@unseenco/theatre-studio/uiComponents/icons'
import DoubleChevronLeft from '@unseenco/theatre-studio/uiComponents/icons/DoubleChevronLeft'
import DoubleChevronRight from '@unseenco/theatre-studio/uiComponents/icons/DoubleChevronRight'
import TimelineIcon from '@unseenco/theatre-studio/uiComponents/icons/TimelineIcon'
import RemoteEditorIcon from '@unseenco/theatre-studio/uiComponents/icons/RemoteEditorIcon'
import DockLayout from '@unseenco/theatre-studio/uiComponents/icons/DockLayout'
import ToolbarIconButton from '@unseenco/theatre-studio/uiComponents/toolbar/ToolbarIconButton'
import {
  useNotifications,
  useEmptyNotificationsTooltip,
} from '@unseenco/theatre-studio/notify'
import {openRemoteEditorWindow} from '@unseenco/theatre-studio/remoteEditor'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'
import {
  DOCKED_TOOLBAR_BUTTON_SIZE,
  DOCKED_TOOLBAR_PADDING_X,
  DOCKED_TOOLBAR_PADDING_Y,
} from '@unseenco/theatre-studio/UIRoot/dockedLayoutConstants'

const Container = styled.div<{$docked: boolean}>`
  pointer-events: none;
  display: flex;
  justify-content: space-between;

  ${({$docked}) =>
    $docked
      ? css`
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          flex: 1;
          min-height: ${DOCKED_TOOLBAR_BUTTON_SIZE +
          DOCKED_TOOLBAR_PADDING_Y * 2}px;
          padding: ${DOCKED_TOOLBAR_PADDING_Y}px ${DOCKED_TOOLBAR_PADDING_X}px;
        `
      : css`
          height: 36px;
          padding: 12px;
        `};
`

const NumberOfConflictsIndicator = styled.div`
  color: white;
  width: 14px;
  height: 14px;
  background: #d00;
  border-radius: 4px;
  text-align: center;
  line-height: 14px;
  font-weight: 600;
  font-size: 8px;
  position: relative;
  left: -6px;
  top: -11px;
  margin-right: -14px;
  box-shadow: 0 4px 6px -4px #00000059;
`

const SubContainer = styled.div`
  display: flex;
  gap: 8px;
`

const HasUpdatesBadge = styled.div<{type: 'info' | 'warning'}>`
  position: absolute;
  background: ${({type}) => (type === 'info' ? '#40aaa4' : '#f59e0b')};
  width: 6px;
  height: 6px;
  border-radius: 50%;
  right: -2px;
  top: -2px;
`

const GroupDivider = styled.div`
  position: absolute;
  height: 32px;
  width: 1px;
  background: #373b40;
  opacity: 0.4;
`

const GlobalToolbar: React.FC = () => {
  const conflicts = usePrism(() => {
    const ephemeralStateOfAllProjects = val(
      getStudio().atomP.ephemeral.coreByProject,
    )
    return Object.entries(ephemeralStateOfAllProjects)
      .map(([projectId, state]) => ({projectId, state}))
      .filter(
        ({state}) =>
          state.loadingState.type === 'browserStateIsNotBasedOnDiskState',
      )
  }, [])
  const [triggerTooltip, triggerButtonRef] = useTooltip(
    {enabled: conflicts.length > 0, enterDelay: conflicts.length > 0 ? 0 : 200},
    () =>
      conflicts.length > 0 ? (
        <ErrorTooltip>
          {conflicts.length === 1
            ? `There is a state conflict in project "${conflicts[0].projectId}". Select the project in the outline below in order to fix it.`
            : `There are ${conflicts.length} projects that have state conflicts. They are highlighted in the outline below. `}
        </ErrorTooltip>
      ) : (
        <BasicTooltip>
          <>Outline</>
        </BasicTooltip>
      ),
  )

  const outlinePinned = useVal(getStudio().atomP.ahistoric.pinOutline) ?? true
  const detailsPinned = useVal(getStudio().atomP.ahistoric.pinDetails) ?? true
  const sequenceEditorPinned =
    useVal(getStudio().atomP.ahistoric.pinSequenceEditor) ?? true
  const dockedMode = useVal(getStudio().atomP.historic.dockedMode) ?? false
  const {isDocked} = useLayoutMode()

  const {hasNotifications} = useNotifications()

  const [notificationsTooltip, notificationsTriggerRef] =
    useEmptyNotificationsTooltip()

  return (
    <Container $docked={isDocked}>
      <SubContainer>
        {triggerTooltip}
        <PinButton
          ref={triggerButtonRef as $IntentionalAny}
          data-testid="OutlinePanel-TriggerButton"
          onClick={() => {
            getStudio().transaction(({stateEditors, drafts}) => {
              stateEditors.studio.ahistoric.setPinOutline(
                !(drafts.ahistoric.pinOutline ?? true),
              )
            })
          }}
          icon={<Outline />}
          pinHintIcon={<DoubleChevronRight />}
          unpinHintIcon={<DoubleChevronLeft />}
          pinned={outlinePinned}
        />
        {conflicts.length > 0 ? (
          <NumberOfConflictsIndicator>
            {conflicts.length}
          </NumberOfConflictsIndicator>
        ) : null}
        <PinButton
          title="Toggle Timeline"
          onClick={() => {
            getStudio().transaction(({stateEditors, drafts}) => {
              stateEditors.studio.ahistoric.setPinSequenceEditor(
                !(drafts.ahistoric.pinSequenceEditor ?? true),
              )
            })
          }}
          icon={<TimelineIcon />}
          pinHintIcon={<TimelineIcon />}
          unpinHintIcon={<TimelineIcon />}
          pinned={sequenceEditorPinned}
        />
        <ToolbarIconButton
          data-testid="DockedLayout-ToggleButton"
          className={dockedMode ? 'selected' : ''}
          onClick={() => {
            getStudio().transaction(({stateEditors, drafts}) => {
              stateEditors.studio.historic.setDockedMode(
                !(drafts.historic.dockedMode ?? false),
              )
            })
          }}
          title={dockedMode ? 'Float panels' : 'Dock panels'}
        >
          <DockLayout />
        </ToolbarIconButton>
        {window.location.hash !== '#editor' && (
          <ToolbarIconButton
            onClick={openRemoteEditorWindow}
            title="Open remote editor window"
          >
            <RemoteEditorIcon />
          </ToolbarIconButton>
        )}
        <ExtensionToolbar showLeftDivider toolbarId="global" />
      </SubContainer>
      <SubContainer>
        {notificationsTooltip}
        <PinButton
          ref={notificationsTriggerRef as $IntentionalAny}
          onClick={() => {
            getStudio().transaction(({stateEditors, drafts}) => {
              stateEditors.studio.ahistoric.setPinNotifications(
                !(drafts.ahistoric.pinNotifications ?? false),
              )
            })
          }}
          icon={<Bell />}
          pinHintIcon={<Bell />}
          unpinHintIcon={<Bell />}
          pinned={useVal(getStudio().atomP.ahistoric.pinNotifications) ?? false}
        >
          {hasNotifications && <HasUpdatesBadge type="warning" />}
        </PinButton>
        <PinButton
          ref={triggerButtonRef as $IntentionalAny}
          onClick={() => {
            getStudio().transaction(({stateEditors, drafts}) => {
              stateEditors.studio.ahistoric.setPinDetails(
                !(drafts.ahistoric.pinDetails ?? true),
              )
            })
          }}
          icon={<Details />}
          pinHintIcon={<DoubleChevronLeft />}
          unpinHintIcon={<DoubleChevronRight />}
          pinned={detailsPinned}
        />
      </SubContainer>
    </Container>
  )
}

export default GlobalToolbar
