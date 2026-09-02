import type {StudioPersistentState} from '@unseenco/theatre-studio/store'
import type {ProjectId, SheetId} from '@unseenco/theatre-shared/utils/ids'
import {
  mergePersistentState,
  splitPersistentState,
} from './splitPersistentState'

describe('splitPersistentState', () => {
  const projectId = 'my-project' as ProjectId
  const sheetId = 'main' as SheetId

  const sampleState: StudioPersistentState = {
    historic: {
      currentCommitHash: undefined,
      commitsByHash: {},
      listOfCommitHashes: [],
      innerState: {
        projects: {stateByProjectId: {}},
        autoKey: true,
        coreByProject: {
          [projectId]: {
            sheetsById: {},
            definitionVersion: '0.4.0',
            revisionHistory: [],
          },
        },
        panelInstanceDesceriptors: {},
        dockedMode: true,
      },
    },
    ahistoric: {
      pinOutline: false,
      visibilityState: 'everythingIsVisible',
      theTrigger: {
        position: {
          closestCorner: 'bottomLeft',
          distanceFromHorizontalEdge: 0.02,
          distanceFromVerticalEdge: 0.02,
        },
      },
      coreByProject: {
        [projectId]: {
          ahistoricStuff: '',
        },
      },
      projects: {
        stateByProjectId: {
          [projectId]: {
            stateBySheetId: {
              [sheetId]: {
                sequence: {
                  clippedSpaceRange: {start: 0, end: 10},
                },
              },
            },
          },
        },
      },
    },
  }

  it('splits studio and project state', () => {
    const {studio, project} = splitPersistentState(sampleState)

    expect(studio.historic.innerState).not.toHaveProperty('coreByProject')
    expect(studio.historic.innerState.dockedMode).toBe(true)
    expect(studio.ahistoric).not.toHaveProperty('coreByProject')
    expect(studio.ahistoric.pinOutline).toBe(false)

    expect(project.historic[projectId]).toBeDefined()
    expect(project.ahistoric[projectId]).toEqual({ahistoricStuff: ''})
  })

  it('merges split state back into a full persistent state', () => {
    const {studio, project} = splitPersistentState(sampleState)
    const merged = mergePersistentState(studio, project)

    expect(merged).toEqual(sampleState)
  })

  it('round-trips through JSON serialization', () => {
    const {studio, project} = splitPersistentState(sampleState)
    const merged = mergePersistentState(
      JSON.parse(JSON.stringify(studio)),
      JSON.parse(JSON.stringify(project)),
    )

    expect(merged).toEqual(sampleState)
  })
})
