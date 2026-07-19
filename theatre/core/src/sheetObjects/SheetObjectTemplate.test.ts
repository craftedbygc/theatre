/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@theatre/shared/testUtils'
import getStudio from '@theatre/studio/getStudio'
import {encodePathToProp} from '@theatre/shared/utils/addresses'
import {asSequenceTrackId} from '@theatre/shared/utils/ids'
import type {ObjectAddressKey, SequenceTrackId} from '@theatre/shared/utils/ids'
import type {$IntentionalAny} from '@theatre/shared/utils/types'
import {iterateOver} from '@theatre/dataverse'

describe(`SheetObjectTemplate`, () => {
  describe(`getArrayOfValidSequenceTracks()`, () => {
    it('should only include valid tracks', async () => {
      const {obj} = await setupTestSheet({
        staticOverrides: {
          byObject: {},
        },
        sequence: {
          type: 'PositionalSequence',
          subUnitsPerUnit: 30,
          length: 10,
          tracksByObject: {
            ['obj' as ObjectAddressKey]: {
              trackIdByPropPath: {
                [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
                [encodePathToProp(['position', 'invalid'])]:
                  asSequenceTrackId('invalidTrack'),
              },
              trackData: {
                ['x' as SequenceTrackId]: null as $IntentionalAny,
                ['invalid' as SequenceTrackId]: null as $IntentionalAny,
              },
            },
          },
        },
      })

      const iter = iterateOver(obj.template.getArrayOfValidSequenceTracks('default'))

      const validTracks = iter.next().value
      expect(validTracks).toHaveLength(1)
      expect(validTracks).toMatchObject([
        {
          pathToProp: ['position', 'x'],
          trackId: 'x',
        },
      ])
    })

    it('should return empty array when no tracks are set up', async () => {
      const {obj} = await setupTestSheet({
        staticOverrides: {
          byObject: {},
        },
        sequence: {
          type: 'PositionalSequence',
          subUnitsPerUnit: 30,
          length: 10,
          tracksByObject: {},
        },
      })
      const iter = iterateOver(obj.template.getArrayOfValidSequenceTracks('default'))

      expect(iter.next().value).toHaveLength(0)
    })
  })
  describe(`getMapOfValidSequenceTracks_forStudio()`, () => {
    it('should return valid sequences in map form', async () => {
      const {obj} = await setupTestSheet({
        staticOverrides: {
          byObject: {},
        },
        sequence: {
          type: 'PositionalSequence',
          subUnitsPerUnit: 30,
          length: 10,
          tracksByObject: {
            ['obj' as ObjectAddressKey]: {
              trackIdByPropPath: {
                [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
                [encodePathToProp(['position', 'invalid'])]:
                  asSequenceTrackId('invalidTrack'),
              },
              trackData: {
                ['x' as SequenceTrackId]: null as $IntentionalAny,
                ['invalid' as SequenceTrackId]: null as $IntentionalAny,
              },
            },
          },
        },
      })

      const iter = iterateOver(
        obj.template.getMapOfValidSequenceTracks_forStudio('default'),
      )

      const validTracks = iter.next().value
      expect(validTracks).toMatchObject({
        position: {
          x: 'x',
        },
      })
    })
  })

  describe(`sequence variant inheritance`, () => {
    it('inherits default variant tracks on other variants unless overridden', async () => {
      const {obj, sheet} = await setupTestSheet({
        staticOverrides: {byObject: {}},
        sequencesById: {
          default: {
            type: 'PositionalSequence',
            subUnitsPerUnit: 30,
            length: 10,
            tracksByObject: {
              ['obj' as ObjectAddressKey]: {
                trackIdByPropPath: {
                  [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
                },
                trackData: {
                  ['x' as SequenceTrackId]: null as $IntentionalAny,
                },
              },
            },
          },
          mobile: {
            type: 'PositionalSequence',
            subUnitsPerUnit: 30,
            length: 10,
            tracksByObject: {},
          },
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      const mobileTracks = obj.template
        .getArrayOfValidSequenceTracks('mobile')
        .getValue()

      expect(mobileTracks).toHaveLength(1)
      expect(mobileTracks[0]).toMatchObject({
        pathToProp: ['position', 'x'],
        trackId: 'x',
        trackVariant: 'default',
      })
    })

    it('copies default sequence tracks when overriding object into another variant', async () => {
      const {obj, sheet} = await setupTestSheet({
        staticOverrides: {byObject: {}},
        sequencesById: {
          default: {
            type: 'PositionalSequence',
            subUnitsPerUnit: 30,
            length: 10,
            tracksByObject: {
              ['obj' as ObjectAddressKey]: {
                trackIdByPropPath: {
                  [encodePathToProp(['position', 'x'])]: asSequenceTrackId('x'),
                },
                trackData: {
                  ['x' as SequenceTrackId]: {
                    type: 'BasicKeyframedTrack',
                    keyframes: [
                      {
                        id: 'kf1' as $IntentionalAny,
                        position: 0,
                        value: 1,
                        connectedRight: true,
                        handles: [0.5, 1, 0.5, 0],
                        type: 'bezier',
                      },
                    ],
                  } as $IntentionalAny,
                },
              },
            },
          },
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.addVariantObjectOverride(
          {
            projectId: sheet.address.projectId,
            sheetId: sheet.address.sheetId,
            variant: 'mobile',
            objectKey: 'obj' as ObjectAddressKey,
          },
        )
      })

      const mobileTracks = obj.template
        .getArrayOfValidSequenceTracks('mobile')
        .getValue()

      expect(mobileTracks).toHaveLength(1)
      expect(mobileTracks[0]).toMatchObject({
        pathToProp: ['position', 'x'],
        trackVariant: 'mobile',
      })
    })

    it('inherits default variant static overrides on other variants unless overridden', async () => {
      const {obj} = await setupTestSheet({
        staticOverrides: {
          byObject: {
            ['obj' as ObjectAddressKey]: {
              position: {x: 5},
            },
          },
        },
        staticOverridesByVariant: {
          mobile: {
            byObject: {
              ['obj' as ObjectAddressKey]: {
                position: {x: 10},
              },
            },
          },
        },
      })

      const defaultStatics = obj.template.getStaticValues('default').getValue()
      const mobileStatics = obj.template.getStaticValues('mobile').getValue()

      expect(defaultStatics).toMatchObject({position: {x: 5}})
      expect(mobileStatics).toMatchObject({position: {x: 10}})
    })
  })
})
