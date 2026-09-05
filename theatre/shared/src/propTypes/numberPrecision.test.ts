import {compound, number} from '@unseenco/theatre-core/propTypes'
import {
  applyNumberPrecisionDefaultsToPropConfig,
  DEFAULT_NUMBER_PRECISION,
  resolveNumberPrecision,
  roundNumberToPrecision,
} from './numberPrecision'

describe('numberPrecision', () => {
  describe('resolveNumberPrecision', () => {
    it('uses prop precision when set', () => {
      expect(resolveNumberPrecision(2, 5)).toBe(2)
    })

    it('falls back to project precision when prop precision is unset', () => {
      expect(resolveNumberPrecision(undefined, 5)).toBe(5)
    })

    it('falls back to the default when neither is set', () => {
      expect(resolveNumberPrecision(undefined, undefined)).toBe(
        DEFAULT_NUMBER_PRECISION,
      )
    })
  })

  describe('roundNumberToPrecision', () => {
    it('rounds to the configured number of decimal places', () => {
      expect(roundNumberToPrecision(1.23456, 2)).toBe(1.23)
      expect(roundNumberToPrecision(1.23556, 2)).toBe(1.24)
    })

    it('returns non-finite values unchanged', () => {
      expect(roundNumberToPrecision(NaN, 2)).toBeNaN()
      expect(roundNumberToPrecision(Infinity, 2)).toBe(Infinity)
    })
  })

  describe('applyNumberPrecisionDefaultsToPropConfig', () => {
    it('applies project precision to number props without an override', () => {
      const config = compound({
        x: number(0),
        nested: compound({
          y: number(0, {precision: 1}),
        }),
      })

      const withDefaults = applyNumberPrecisionDefaultsToPropConfig(config, 2)

      expect(withDefaults.type).toBe('compound')
      if (withDefaults.type !== 'compound') return

      expect(withDefaults.props.x.type).toBe('number')
      if (withDefaults.props.x.type !== 'number') return
      expect(withDefaults.props.x.precision).toBe(2)

      const nested = withDefaults.props.nested
      expect(nested.type).toBe('compound')
      if (nested.type !== 'compound') return

      expect(nested.props.y.type).toBe('number')
      if (nested.props.y.type !== 'number') return
      expect(nested.props.y.precision).toBe(1)
    })

    it('uses the default precision when project precision is unset', () => {
      const config = number(0)
      const withDefaults = applyNumberPrecisionDefaultsToPropConfig(
        config,
        undefined,
      )

      expect(withDefaults.type).toBe('number')
      if (withDefaults.type !== 'number') return
      expect(withDefaults.precision).toBe(DEFAULT_NUMBER_PRECISION)
    })
  })
})
