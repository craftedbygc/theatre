/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {val} from '@unseenco/theatre-dataverse'
import pointerDeep from '@unseenco/theatre-shared/utils/pointerDeep'
import {propHasDivergedFromSavedState} from './propHasDivergedFromSavedState'

const emptySheetState = {
  staticOverrides: {byObject: {}},
}

describe('propHasDivergedFromSavedState', () => {
  test('returns false when surface and permanent historic state match', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 10)
    })

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
  })

  test('returns true while a scrub transaction is open', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    const scrub = studio.scrub()
    scrub.capture(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(true)

    scrub.discard()
    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
  })

  test('returns false again after committing a scrub', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    const scrub = studio.scrub()
    scrub.capture(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })
    scrub.commit()

    expect(
      propHasDivergedFromSavedState(obj, ['position', 'x']),
    ).toBe(false)
    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
  })
})
