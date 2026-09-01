import type {StudioPersistentState} from '@unseenco/theatre-studio/store'
import type {
  StudioAhistoricState,
  StudioHistoricState,
} from '@unseenco/theatre-studio/store/types'

export function getStudioOnlyAhistoricInitialState(): Omit<
  StudioAhistoricState,
  'coreByProject'
> {
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

export function getStudioOnlyHistoricInitialState(): Omit<
  StudioHistoricState,
  'coreByProject'
> {
  return {
    projects: {
      stateByProjectId: {},
    },
    autoKey: true,
    panelInstanceDesceriptors: {},
  }
}

export function resetStudioFieldsInPersistentState(
  state: StudioPersistentState,
): StudioPersistentState {
  return {
    historic: {
      ...state.historic,
      currentCommitHash: undefined,
      commitsByHash: {},
      listOfCommitHashes: [],
      innerState: {
        ...getStudioOnlyHistoricInitialState(),
        coreByProject: state.historic.innerState.coreByProject,
      },
    },
    ahistoric: {
      ...getStudioOnlyAhistoricInitialState(),
      coreByProject: state.ahistoric.coreByProject,
    },
  }
}

export function resetProjectFieldsInPersistentState(
  state: StudioPersistentState,
): StudioPersistentState {
  return {
    historic: {
      ...state.historic,
      currentCommitHash: undefined,
      commitsByHash: {},
      listOfCommitHashes: [],
      innerState: {
        ...state.historic.innerState,
        coreByProject: {},
      },
    },
    ahistoric: {
      ...state.ahistoric,
      coreByProject: {},
    },
  }
}
