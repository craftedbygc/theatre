import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import {encodePathToProp} from '@unseenco/theatre-shared/utils/addresses'
import {
  isPathUnderTransientPrefix,
  normalizeTransientPropPaths,
  normalizeStaticPropPaths,
  parseTransientPropPath,
  stripTransientPathsFromSerializableMap,
  stripTransientPropsFromObjectInSheetState,
  stripSequenceTracksForPathsFromObjectInSheetState,
} from './transientPropPaths'

describe('transientPropPaths', () => {
  const config = {
    type: 'compound',
    props: {
      foo: {
        type: 'compound',
        props: {
          bar: {type: 'number', default: 0},
          baz: {type: 'number', default: 1},
        },
      },
      qux: {type: 'number', default: 2},
    },
  } as unknown as PropTypeConfig

  describe('parseTransientPropPath', () => {
    it('parses dot notation', () => {
      expect(parseTransientPropPath('foo.bar')).toEqual(['foo', 'bar'])
    })

    it('parses array paths', () => {
      expect(parseTransientPropPath(['foo', 'bar'])).toEqual(['foo', 'bar'])
    })
  })

  describe('isPathUnderTransientPrefix', () => {
    const prefixes = normalizeTransientPropPaths(['foo'], config, 'obj')

    it('matches exact prefix', () => {
      expect(isPathUnderTransientPrefix(['foo'], prefixes)).toBe(true)
    })

    it('matches descendants', () => {
      expect(isPathUnderTransientPrefix(['foo', 'bar'], prefixes)).toBe(true)
    })

    it('does not match siblings', () => {
      expect(isPathUnderTransientPrefix(['qux'], prefixes)).toBe(false)
    })
  })

  describe('normalizeTransientPropPaths', () => {
    it('validates paths in dev mode', () => {
      expect(() =>
        normalizeTransientPropPaths(['missing'], config, 'obj'),
      ).toThrow(/does not match any prop/)
    })

    it('returns encoded paths', () => {
      const result = normalizeTransientPropPaths(['foo.bar'], config, 'obj')
      expect(result.has(encodePathToProp(['foo', 'bar']))).toBe(true)
    })
  })

  describe('stripTransientPathsFromSerializableMap', () => {
    it('removes values under transient prefixes', () => {
      const map = {foo: {bar: 5, baz: 6}, qux: 7}
      const prefixes = normalizeTransientPropPaths(['foo.bar'], config, 'obj')
      expect(stripTransientPathsFromSerializableMap(map, prefixes)).toEqual({
        foo: {baz: 6},
        qux: 7,
      })
    })
  })

  describe('normalizeStaticPropPaths', () => {
    it('validates paths in dev mode', () => {
      expect(() =>
        normalizeStaticPropPaths(['missing'], config, 'obj'),
      ).toThrow(/does not match any prop/)
    })
  })

  describe('stripSequenceTracksForPathsFromObjectInSheetState', () => {
    it('removes sequence tracks but keeps static overrides', () => {
      const prefixes = normalizeStaticPropPaths(['foo.bar'], config, 'obj')
      const sheetState = {
        staticOverrides: {
          byObject: {
            obj: {foo: {bar: 5}, qux: 7},
          },
        },
        sequence: {
          type: 'PositionalSequence' as const,
          length: 10,
          subUnitsPerUnit: 30,
          tracksByObject: {
            obj: {
              trackIdByPropPath: {
                [encodePathToProp(['foo', 'bar'])]: 'track1',
              },
              trackData: {
                track1: {type: 'BasicKeyframedTrack', keyframes: []},
              },
            },
          },
        },
      }

      stripSequenceTracksForPathsFromObjectInSheetState(
        sheetState,
        'obj' as ObjectAddressKey,
        prefixes,
      )

      expect(sheetState.staticOverrides.byObject.obj).toEqual({
        foo: {bar: 5},
        qux: 7,
      })
      expect(
        sheetState.sequence!.tracksByObject.obj.trackData.track1,
      ).toBeUndefined()
    })
  })

  describe('stripTransientPropsFromObjectInSheetState', () => {
    it('strips static overrides and sequence tracks for transient paths', () => {
      const prefixes = normalizeTransientPropPaths(['foo.bar'], config, 'obj')
      const sheetState = {
        staticOverrides: {
          byObject: {
            obj: {foo: {bar: 5, baz: 6}, qux: 7},
          },
        },
        sequence: {
          type: 'PositionalSequence' as const,
          length: 10,
          subUnitsPerUnit: 30,
          tracksByObject: {
            obj: {
              trackIdByPropPath: {
                [encodePathToProp(['foo', 'bar'])]: 'track1',
                [encodePathToProp(['qux'])]: 'track2',
              },
              trackData: {
                track1: {type: 'BasicKeyframedTrack', keyframes: []},
                track2: {type: 'BasicKeyframedTrack', keyframes: []},
              },
            },
          },
        },
      }

      stripTransientPropsFromObjectInSheetState(
        sheetState,
        'obj' as ObjectAddressKey,
        prefixes,
      )

      expect(sheetState.staticOverrides.byObject.obj).toEqual({
        foo: {baz: 6},
        qux: 7,
      })
      expect(
        sheetState.sequence!.tracksByObject.obj.trackIdByPropPath[
          encodePathToProp(['foo', 'bar'])
        ],
      ).toBeUndefined()
      expect(
        sheetState.sequence!.tracksByObject.obj.trackData.track1,
      ).toBeUndefined()
      expect(
        sheetState.sequence!.tracksByObject.obj.trackData.track2,
      ).toBeDefined()
    })
  })
})
