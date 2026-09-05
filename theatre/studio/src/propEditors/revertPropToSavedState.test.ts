/*
 * @jest-environment jsdom
 */
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {val} from '@unseenco/theatre-dataverse'
import pointerDeep from '@unseenco/theatre-shared/utils/pointerDeep'
import {
  propCanRevertToSavedState,
  revertPropToSavedState,
} from './revertPropToSavedState'
import {propHasDivergedFromSavedState} from './propHasDivergedFromSavedState'
import {getPropConfigByPath} from '@unseenco/theatre-shared/propTypes/utils'

const emptySheetState = {
  staticOverrides: {byObject: {}},
}

describe('revertPropToSavedState', () => {
  test('propCanRevertToSavedState is false when values match saved json', async () => {
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

    expect(propCanRevertToSavedState(obj, ['position', 'x'])).toBe(false)
  })

  test('propCanRevertToSavedState is true when a static prop differs from saved json', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(propCanRevertToSavedState(obj, ['position', 'x'])).toBe(true)
  })

  test('reverts a modified static prop back to the saved json value', async () => {
    const sheetState = {
      staticOverrides: {
        byObject: {
          ['obj' as ObjectAddressKey]: {
            position: {x: 10},
          },
        },
      },
    }
    const {studio, obj, objPublicAPI} = await setupTestSheet(sheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(42)
    expect(propHasDivergedFromSavedState(obj, ['position', 'x'])).toBe(true)

    studio.transaction(({stateEditors}) => {
      revertPropToSavedState(
        stateEditors,
        obj,
        ['position', 'x'],
        getPropConfigByPath(obj.template.staticConfig, ['position', 'x'])!,
      )
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(10)
    expect(propHasDivergedFromSavedState(obj, ['position', 'x'])).toBe(false)
    expect(propCanRevertToSavedState(obj, ['position', 'x'])).toBe(false)
  })

  test('reverts a newly overridden prop back to the saved default', async () => {
    const {studio, obj, objPublicAPI} = await setupTestSheet(emptySheetState)

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })

    studio.transaction(({stateEditors}) => {
      revertPropToSavedState(
        stateEditors,
        obj,
        ['position', 'x'],
        getPropConfigByPath(obj.template.staticConfig, ['position', 'x'])!,
      )
    })

    expect(val(pointerDeep(obj.propsP, ['position', 'x']))).toBe(0)
    expect(propHasDivergedFromSavedState(obj, ['position', 'x'])).toBe(false)
  })
})
