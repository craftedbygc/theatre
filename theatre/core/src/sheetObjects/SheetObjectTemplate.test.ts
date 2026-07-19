/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@theatre/shared/testUtils'
// eslint-disable-next-line no-restricted-syntax
import getStudio from '@theatre/studio/getStudio'
import {encodePathToProp} from '@theatre/shared/utils/addresses'
import {asSequenceTrackId} from '@theatre/shared/utils/ids'
import type {ObjectAddressKey, SequenceTrackId} from '@theatre/shared/utils/ids'
import type {$IntentionalAny} from '@theatre/shared/utils/types'
import {iterateOver, val} from '@theatre/dataverse'

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

      const iter = iterateOver(
        obj.template.getArrayOfValidSequenceTracks('default'),
      )

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
      const iter = iterateOver(
        obj.template.getArrayOfValidSequenceTracks('default'),
      )

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
    it('inherits default variant tracks on other variants without an object override', async () => {
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
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
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

    it('inherits default tracks after removing object override', async () => {
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
                    keyframes: [],
                  } as $IntentionalAny,
                },
              },
            },
          },
        },
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.removeVariantObjectOverride(
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
        trackId: 'x',
        trackVariant: 'default',
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
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
        },
      })

      const defaultStatics = obj.template.getStaticValues('default').getValue()
      const mobileStatics = obj.template.getStaticValues('mobile').getValue()

      expect(defaultStatics).toMatchObject({position: {x: 5}})
      expect(mobileStatics).toMatchObject({position: {x: 10}})
    })

    it('inherits default variant static overrides without an object override', async () => {
      const {obj} = await setupTestSheet({
        staticOverrides: {
          byObject: {
            ['obj' as ObjectAddressKey]: {
              position: {x: 5},
            },
          },
        },
      })

      const mobileStatics = obj.template.getStaticValues('mobile').getValue()

      expect(mobileStatics).toMatchObject({position: {x: 5}})
    })

    it('does not inherit default tracks when a prop is explicitly unsequenced on a variant', async () => {
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
                  [encodePathToProp(['position', 'y'])]: asSequenceTrackId('y'),
                },
                trackData: {
                  ['x' as SequenceTrackId]: null as $IntentionalAny,
                  ['y' as SequenceTrackId]: null as $IntentionalAny,
                },
              },
            },
          },
          mobile: {
            type: 'PositionalSequence',
            subUnitsPerUnit: 30,
            length: 10,
            tracksByObject: {
              ['obj' as ObjectAddressKey]: {
                trackIdByPropPath: {},
                unsequencedPropPaths: [encodePathToProp(['position', 'x'])],
                trackData: {},
              },
            },
          },
        },
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      const mobileTracks = obj.template
        .getArrayOfValidSequenceTracks('mobile')
        .getValue()

      expect(mobileTracks).toHaveLength(1)
      expect(mobileTracks[0]).toMatchObject({
        pathToProp: ['position', 'y'],
        trackId: 'y',
        trackVariant: 'default',
      })
    })

    it('make static on a variant with copied tracks blocks default inheritance in one step', async () => {
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
        },
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsStatic(
          {
            projectId: sheet.address.projectId,
            sheetId: sheet.address.sheetId,
            objectKey: 'obj' as ObjectAddressKey,
            pathToProp: ['position', 'x'],
            value: 1,
            sequenceVariant: 'mobile',
          },
        )
      })

      const mobileTracks = obj.template
        .getArrayOfValidSequenceTracks('mobile')
        .getValue()

      expect(mobileTracks).toHaveLength(0)
    })

    it('reset on a variant restores default sequence as an independent copy', async () => {
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
                        id: 'default-kf' as $IntentionalAny,
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
          mobile: {
            type: 'PositionalSequence',
            subUnitsPerUnit: 30,
            length: 10,
            tracksByObject: {},
          },
        },
        variantObjectOverrides: {
          mobile: ['obj' as ObjectAddressKey],
        },
      })

      sheet.publicApi.declareSequenceVariants(['default', 'mobile'])

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsStatic(
          {
            projectId: sheet.address.projectId,
            sheetId: sheet.address.sheetId,
            objectKey: 'obj' as ObjectAddressKey,
            pathToProp: ['position', 'x'],
            value: 1,
            sequenceVariant: 'mobile',
          },
        )
      })

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.coreByProject.historic.sheetsById.sequence.resetPrimitivePropOnVariant(
          {
            projectId: sheet.address.projectId,
            sheetId: sheet.address.sheetId,
            objectKey: 'obj' as ObjectAddressKey,
            pathToProp: ['position', 'x'],
            sequenceVariant: 'mobile',
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
      expect(mobileTracks[0]!.trackId).not.toBe('x')

      getStudio()!.transaction(({stateEditors}) => {
        stateEditors.coreByProject.historic.sheetsById.sequence.setKeyframeAtPosition(
          {
            projectId: sheet.address.projectId,
            sheetId: sheet.address.sheetId,
            objectKey: 'obj' as ObjectAddressKey,
            pathToProp: ['position', 'x'],
            trackId: 'x' as SequenceTrackId,
            position: 0,
            value: 99,
            snappingFunction: (n) => n,
            type: 'bezier',
            sequenceVariant: 'default',
          },
        )
      })

      const mobileTrackData = val(
        obj.template.project.pointers.historic.sheetsById[sheet.address.sheetId]
          .sequencesById.mobile.tracksByObject['obj' as ObjectAddressKey]
          .trackData[mobileTracks[0]!.trackId],
      )

      expect(mobileTrackData?.keyframes[0]?.value).toBe(1)
    })
  })
})
