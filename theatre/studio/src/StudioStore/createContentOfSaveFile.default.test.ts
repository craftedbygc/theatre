/*
 * @jest-environment jsdom
 */
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'

const emptySheetState = {
  staticOverrides: {byObject: {}},
}

describe('createContentOfSaveFile default prop stripping', () => {
  test('includes changed static overrides in exported state', async () => {
    const {studio, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 25)
    })

    const exported = studio.createContentOfSaveFile(
      objPublicAPI.address.projectId,
    )
    expect(
      exported.sheetsById['Sheet' as keyof typeof exported.sheetsById]
        ?.staticOverrides.byObject['obj' as ObjectAddressKey],
    ).toEqual({
      position: {x: 25},
    })
  })

  test('omits static overrides after undoing a change', async () => {
    const {studio, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 25)
    })

    studio.undo()

    const exported = studio.createContentOfSaveFile(
      objPublicAPI.address.projectId,
    )
    expect(
      exported.sheetsById['Sheet' as keyof typeof exported.sheetsById]
        ?.staticOverrides?.byObject?.['obj' as ObjectAddressKey],
    ).toBeUndefined()
  })

  test('does not store a static override when set back to default', async () => {
    const {studio, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 25)
      set(objPublicAPI.props.position.x, 0)
    })

    const exported = studio.createContentOfSaveFile(
      objPublicAPI.address.projectId,
    )
    expect(
      exported.sheetsById['Sheet' as keyof typeof exported.sheetsById]
        ?.staticOverrides?.byObject?.['obj' as ObjectAddressKey],
    ).toBeUndefined()
  })

  test('keeps non-default rgba overrides only', async () => {
    const {studio, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.color, {r: 0.1, g: 0.2, b: 0.3, a: 1})
    })

    const exported = studio.createContentOfSaveFile(
      objPublicAPI.address.projectId,
    )
    expect(
      exported.sheetsById['Sheet' as keyof typeof exported.sheetsById]
        ?.staticOverrides.byObject['obj' as ObjectAddressKey],
    ).toEqual({
      color: {r: 0.1, g: 0.2, b: 0.3, a: 1},
    })
  })
})
