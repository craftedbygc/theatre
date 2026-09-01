/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {privateAPI} from '@unseenco/theatre-core/privateAPIs'
import {val} from '@unseenco/theatre-dataverse'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import * as t from '@unseenco/theatre-core/propTypes'

describe('ISheetObject.addProps', () => {
  test('adds new top-level props while preserving existing ones', async () => {
    const {objPublicAPI, sheet, studio} = await setupTestSheet({
      staticOverrides: {byObject: {}},
    })

    expect(Object.keys(objPublicAPI.value).sort()).toEqual([
      'color',
      'deeply',
      'position',
    ])

    objPublicAPI.addProps({opacity: t.number(1)})

    expect(Object.keys(objPublicAPI.value).sort()).toEqual([
      'color',
      'deeply',
      'opacity',
      'position',
    ])
    expect((objPublicAPI.value as $IntentionalAny).opacity).toBe(1)

    const config = val(privateAPI(objPublicAPI).template.configPointer)
    expect(config.type).toBe('compound')
    expect(Object.keys((config as $IntentionalAny).props).sort()).toEqual([
      'color',
      'deeply',
      'opacity',
      'position',
    ])

    expect(studio).toBeTruthy()
    expect(sheet).toBeTruthy()
  })

  test('throws when adding a prop that already exists', async () => {
    const {objPublicAPI} = await setupTestSheet({
      staticOverrides: {byObject: {}},
    })

    expect(() => {
      objPublicAPI.addProps({position: {x: 0, y: 0, z: 0}})
    }).toThrow(/already exists/)
  })

  test('preserves historic statics and tracks for existing props', async () => {
    const {objPublicAPI, sheet, studio} = await setupTestSheet({
      staticOverrides: {
        byObject: {
          ['obj' as ObjectAddressKey]: {
            position: {x: 1, y: 2, z: 3},
          },
        },
      },
    })

    objPublicAPI.addProps({scale: {x: 1, y: 1, z: 1}})

    const sheetState = val(
      sheet.project.pointers.historic.sheetsById[sheet.address.sheetId],
    )
    expect(
      sheetState?.staticOverrides.byObject['obj' as ObjectAddressKey],
    ).toEqual({
      position: {x: 1, y: 2, z: 3},
    })

    expect(studio).toBeTruthy()
  })
})
