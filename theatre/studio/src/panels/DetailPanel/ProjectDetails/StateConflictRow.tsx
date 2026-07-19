import {useVal} from '@unseenco/theatre-react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import React from 'react'
import styled from 'styled-components'
import {generateDiskStateRevision} from '@unseenco/theatre-studio/StudioStore/generateDiskStateRevision'
import type {ProjectEphemeralState} from '@unseenco/theatre-core/projects/store/storeTypes'
import useTooltip from '@unseenco/theatre-studio/uiComponents/Popover/useTooltip'
import BasicTooltip from '@unseenco/theatre-studio/uiComponents/Popover/BasicTooltip'
import type {$FixMe} from '@unseenco/theatre-shared/utils/types'
import DetailPanelButton from '@unseenco/theatre-studio/uiComponents/DetailPanelButton'
import type {ProjectId} from '@unseenco/theatre-shared/utils/ids'

const Container = styled.div`
  padding: 8px 10px;
  position: relative;
  background-color: #6d232352;
  &:before {
    position: absolute;
    content: ' ';
    display: block;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: #ff000070;
  }
`

const Message = styled.div`
  margin-bottom: 1em;
  & a {
    color: inherit;
  }
`

const ChooseStateRow = styled.div`
  display: flex;
  gap: 8px;
`

const StateConflictRow: React.FC<{projectId: ProjectId}> = ({projectId}) => {
  const loadingState = useVal(
    getStudio().atomP.ephemeral.coreByProject[projectId].loadingState,
  )

  if (!loadingState) return null

  if (loadingState.type === 'browserStateIsNotBasedOnDiskState') {
    return <InConflict loadingState={loadingState} projectId={projectId} />
  } else {
    return null
  }
}

const InConflict: React.FC<{
  projectId: ProjectId
  loadingState: Extract<
    ProjectEphemeralState['loadingState'],
    {type: 'browserStateIsNotBasedOnDiskState'}
  >
}> = ({projectId, loadingState}) => {
  /**
   * This stuff is not undo-safe, but once we switch to the new persistence
   * scheme, these will be unnecessary anyway.
   */
  const useBrowserState = () => {
    getStudio().transaction(({drafts, stateEditors}) => {
      stateEditors.coreByProject.historic.revisionHistory.add({
        projectId,
        revision: loadingState.onDiskState.revisionHistory[0],
      })

      stateEditors.coreByProject.historic.revisionHistory.add({
        projectId,
        revision: generateDiskStateRevision(),
      })

      drafts.ephemeral.coreByProject[projectId]!.loadingState = {
        type: 'loaded',
      }
    })
  }

  const useOnDiskState = () => {
    getStudio().transaction(({drafts}) => {
      drafts.historic.coreByProject[projectId] = loadingState.onDiskState
      drafts.ephemeral.coreByProject[projectId]!.loadingState = {
        type: 'loaded',
      }
    })
  }

  const [browserStateNode, browserStateRef] = useTooltip({}, () => (
    <BasicTooltip>
      The browser's state will override the disk state.
    </BasicTooltip>
  ))

  const [diskStateNode, diskStateRef] = useTooltip({}, () => (
    <BasicTooltip>
      The disk's state will override the browser's state.
    </BasicTooltip>
  ))

  return (
    <Container>
      <Message>
        Browser state is not based on disk state.{' '}
        <a
          href="https://www.theatrejs.com/docs/latest/manual/projects#state"
          target="_blank"
        >
          Learn more.
        </a>
      </Message>
      <ChooseStateRow>
        {browserStateNode}
        <DetailPanelButton
          onClick={useBrowserState}
          ref={browserStateRef as $FixMe}
        >
          Use browser's state
        </DetailPanelButton>
        {diskStateNode}
        <DetailPanelButton
          onClick={useOnDiskState}
          ref={diskStateRef as $FixMe}
        >
          Use disk state
        </DetailPanelButton>
      </ChooseStateRow>
    </Container>
  )
}

export default StateConflictRow
