/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {privateAPI} from '@unseenco/theatre-core/privateAPIs'
import {encodePathToProp} from '@unseenco/theatre-shared/utils/addresses'
import {asSequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import type {
  ObjectAddressKey,
  SequenceTrackId,
} from '@unseenco/theatre-shared/utils/ids'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {val} from '@unseenco/theatre-dataverse'

describe('ISheetObject.reconfigure', () => {
  test('drops removed props from config and strips historic statics/tracks', async () => {
    const {objPublicAPI, sheet, studio} = await setupTestSheet({
      staticOverrides: {
        byObject: {
          ['obj' as ObjectAddressKey]: {
            position: {x: 1, y: 2, z: 3},
            color: {r: 1, g: 0, b: 0, a: 1},
          },
        },
      },
      sequence: {
        type: 'PositionalSequence',
        subUnitsPerUnit: 30,
        length: 10,
        tracksByObject: {
          ['obj' as ObjectAddressKey]: {
            trackIdByPropPath: {
              [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
              [encodePathToProp(['color', 'r'])]: asSequenceTrackId('colorR'),
            },
            trackData: {
              ['x' as SequenceTrackId]: null as $IntentionalAny,
              ['colorR' as SequenceTrackId]: null as $IntentionalAny,
            },
          },
        },
      },
    })

    objPublicAPI.reconfigure({
      position: {x: 0, y: 0, z: 0},
    })

    const config = val(privateAPI(objPublicAPI).template.configPointer)
    expect(config.type).toBe('compound')
    expect(Object.keys((config as $IntentionalAny).props).sort()).toEqual([
      'position',
    ])

    const sheetState = val(
      sheet.project.pointers.historic.sheetsById[sheet.address.sheetId],
    )
    expect(
      sheetState?.staticOverrides.byObject['obj' as ObjectAddressKey],
    ).toEqual({
      position: {x: 1, y: 2, z: 3},
    })
    expect(
      sheetState?.sequence?.tracksByObject?.['obj' as ObjectAddressKey]
        ?.trackIdByPropPath,
    ).toEqual({
      [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
    })

    // keep studio referenced so setup stays consistent with other tests
    expect(studio).toBeTruthy()
  })
})
