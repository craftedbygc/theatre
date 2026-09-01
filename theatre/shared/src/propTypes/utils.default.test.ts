import {
  isPropValueEqualToDefault,
  stripDefaultPropValuesFromMap,
} from '@unseenco/theatre-shared/propTypes/utils'
import {compound, number, rgba} from '@unseenco/theatre-core/propTypes'

describe('propTypes utils default stripping', () => {
  it('detects values equal to prop defaults', () => {
    const width = number(100)
    expect(isPropValueEqualToDefault(100, width)).toBe(true)
    expect(isPropValueEqualToDefault(120, width)).toBe(false)
  })

  it('strips default values from static override maps', () => {
    const config = compound({
      width: number(100),
      height: number(100),
      color: rgba({r: 1, g: 0, b: 0, a: 1}),
    })

    const stripped = stripDefaultPropValuesFromMap(
      {
        width: 150,
        height: 100,
        color: {r: 1, g: 0, b: 0, a: 1},
      },
      config,
    )

    expect(stripped).toEqual({
      width: 150,
    })
  })

  it('returns an empty map when all values are defaults', () => {
    const config = compound({
      width: number(100),
      height: number(100),
    })

    const stripped = stripDefaultPropValuesFromMap(
      {
        width: 100,
        height: 100,
      },
      config,
    )

    expect(stripped).toEqual({})
  })
})
