/*
 * @jest-environment jsdom
 */
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {val} from '@unseenco/theatre-dataverse'
import pointerDeep from '@unseenco/theatre-shared/utils/pointerDeep'
import {propHasDivergedFromSavedState} from './propHasDivergedFromSavedState'

const emptySheetState = {
  staticOverrides: {byObject: {}},
}

describe('propHasDivergedFromSavedState', () => {
  test('returns false when in-memory state matches the loaded json state', async () => {
    const sheetState = {
      staticOverrides: {
        byObject: {
          ['obj' as ObjectAddressKey]: {
            position: {x: 10},
          },
        },
      },
    }
    const {obj} = await setupTestSheet(sheetState)

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
  })

  test('returns true when a prop differs from the loaded json state', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(true)
  })

  test('stays true after commit because the loaded json state is unchanged', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(true)
  })
})
