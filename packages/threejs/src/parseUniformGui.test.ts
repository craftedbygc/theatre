import {types} from '@unseenco/theatre-core'
import {
  numberTypeOptionsFromUniformGui,
  parseUniformGui,
} from './parseUniformGui'

describe('parseUniformGui', () => {
  it('returns empty options when gui is missing', () => {
    expect(parseUniformGui({value: 1})).toEqual({})
  })

  it('parses scalar min/max/step', () => {
    expect(
      parseUniformGui({
        value: 0.5,
        gui: {min: 0, max: 1, step: 0.01},
      }),
    ).toEqual({
      range: [0, 1],
      nudgeMultiplier: 0.01,
    })
  })
})

describe('numberTypeOptionsFromUniformGui', () => {
  it('omits range when gui is missing so t.number accepts the options', () => {
    const opts = numberTypeOptionsFromUniformGui({value: 1})

    expect(opts).toEqual({nudgeMultiplier: 0.01})
    expect(Object.prototype.hasOwnProperty.call(opts, 'range')).toBe(false)
    expect(() => types.number(1, {label: 'uFoo', ...opts})).not.toThrow()
  })

  it('includes range when gui provides min/max', () => {
    const opts = numberTypeOptionsFromUniformGui({
      value: 0.5,
      gui: {min: 0, max: 1},
    })

    expect(opts).toEqual({
      range: [0, 1],
      nudgeMultiplier: 0.01,
    })
    expect(() => types.number(0.5, {label: 'uFoo', ...opts})).not.toThrow()
  })
})
