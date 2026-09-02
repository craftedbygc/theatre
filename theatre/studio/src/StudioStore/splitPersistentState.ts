import type {StudioPersistentState} from '@unseenco/theatre-studio/store'
import type {
  StudioAhistoricState,
  StudioHistoricState,
} from '@unseenco/theatre-studio/store/types'
import type {IWithHistory} from '@unseenco/theatre-studio/utils/redux/withHistory/withHistory'

export type StudioOnlyHistoricState = Omit<StudioHistoricState, 'coreByProject'>
export type StudioOnlyAhistoricState = Omit<StudioAhistoricState, 'coreByProject'>

export type StudioOnlyPersistentState = {
  historic: IWithHistory<StudioOnlyHistoricState>
  ahistoric: StudioOnlyAhistoricState
}

export type ProjectOnlyPersistentState = {
  historic: StudioHistoricState['coreByProject']
  ahistoric: StudioAhistoricState['coreByProject']
}

export function splitPersistentState(state: StudioPersistentState): {
  studio: StudioOnlyPersistentState
  project: ProjectOnlyPersistentState
} {
  const {coreByProject: historicCore, ...historicStudio} =
    state.historic.innerState
  const {coreByProject: ahistoricCore, ...ahistoricStudio} = state.ahistoric

  return {
    studio: {
      historic: {
        ...state.historic,
        innerState: historicStudio,
      },
      ahistoric: ahistoricStudio,
    },
    project: {
      historic: historicCore ?? {},
      ahistoric: ahistoricCore ?? {},
    },
  }
}

export function mergePersistentState(
  studio: StudioOnlyPersistentState | null,
  project: ProjectOnlyPersistentState | null,
): StudioPersistentState | null {
  if (!studio && !project) return null

  const studioHistoric = studio?.historic ?? createEmptyStudioOnlyHistoric()
  const studioAhistoric = studio?.ahistoric ?? createEmptyStudioOnlyAhistoric()
  const projectHistoric = project?.historic ?? {}
  const projectAhistoric = project?.ahistoric ?? {}

  return {
    historic: {
      ...studioHistoric,
      innerState: {
        ...studioHistoric.innerState,
        coreByProject: projectHistoric,
      },
    },
    ahistoric: {
      ...studioAhistoric,
      coreByProject: projectAhistoric,
    },
  }
}

function createEmptyStudioOnlyHistoric(): IWithHistory<StudioOnlyHistoricState> {
  return {
    currentCommitHash: undefined,
    commitsByHash: {},
    listOfCommitHashes: [],
    innerState: {
      projects: {
        stateByProjectId: {},
      },
      autoKey: true,
      panelInstanceDesceriptors: {},
    },
  }
}

function createEmptyStudioOnlyAhistoric(): StudioOnlyAhistoricState {
  return {
    visibilityState: 'everythingIsVisible',
    theTrigger: {
      position: {
        closestCorner: 'bottomLeft',
        distanceFromHorizontalEdge: 0.02,
        distanceFromVerticalEdge: 0.02,
      },
    },
    projects: {
      stateByProjectId: {},
    },
  }
}

export function getStudioStorageKey(localStoragePrefix: string) {
  return localStoragePrefix + '.studio'
}

export function getProjectStorageKey(localStoragePrefix: string) {
  return localStoragePrefix + '.project'
}

export function getLegacyStorageKey(localStoragePrefix: string) {
  return localStoragePrefix + '.persistent'
}
