/*
 * @jest-environment jsdom
 */
import type {Studio} from '@unseenco/theatre-studio/Studio'
import type {ProjectId} from '@unseenco/theatre-shared/utils/ids'
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {val} from '@unseenco/theatre-dataverse'
import pointerDeep from '@unseenco/theatre-shared/utils/pointerDeep'
import {propHasDivergedFromSavedState} from './propHasDivergedFromSavedState'

const emptySheetState = {
  staticOverrides: {byObject: {}},
}

function markCurrentStateAsOnDisk(
  studio: Studio,
  projectId: ProjectId,
): void {
  studio.transaction(({drafts}) => {
    const historic = drafts.historic.coreByProject[projectId]
    const ahistoric = drafts.ahistoric.coreByProject[projectId]
    if (!historic || !ahistoric) return

    drafts.ephemeral.lastPersistedProjectState = {
      historic: {
        [projectId]: JSON.parse(JSON.stringify(historic)),
      },
      ahistoric: {
        [projectId]: JSON.parse(JSON.stringify(ahistoric)),
      },
    }
  })
}

describe('propHasDivergedFromSavedState', () => {
  test('returns false when in-memory state matches the on-disk snapshot', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 10)
    })
    markCurrentStateAsOnDisk(studio, obj.address.projectId)

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
  })

  test('returns true when a committed change has not been persisted to disk yet', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    markCurrentStateAsOnDisk(studio, obj.address.projectId)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(true)
  })

  test('returns false again after the on-disk snapshot is updated', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    markCurrentStateAsOnDisk(studio, obj.address.projectId)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })
    markCurrentStateAsOnDisk(studio, obj.address.projectId)

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
  })
})
