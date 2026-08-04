import {
  getNonPersistingPropPathEncodings,
  propTypeConfigPersists,
  stripNonPersistingPropValuesFromMap,
} from '@unseenco/theatre-shared/propTypes/utils'
import {compound, image, rgba} from './index'

describe('propTypes utils persist', () => {
  it('defaults image props to persisting', () => {
    expect(propTypeConfigPersists(image('texture.png'))).toBe(true)
  })

  it('supports persist: false on image props', () => {
    const imageProp = image('', {persist: false})
    expect(propTypeConfigPersists(imageProp)).toBe(false)
  })

  it('strips non-persisting prop values from maps', () => {
    const config = compound({
      map: image('', {persist: false}),
      color: rgba(),
    })

    const paths = getNonPersistingPropPathEncodings(config)
    expect(paths.size).toBe(1)

    const stripped = stripNonPersistingPropValuesFromMap(
      {
        map: {type: 'image', id: 'texture.png'},
        color: {r: 1, g: 0, b: 0, a: 1},
      },
      config,
    )

    expect(stripped).toEqual({
      color: {r: 1, g: 0, b: 0, a: 1},
    })
  })
})
