import {stripImageAssetsFromAhistoricStaticOverrides} from './assets'

describe('stripImageAssetsFromAhistoricStaticOverrides', () => {
  it('removes image asset values from ahistoric static overrides', () => {
    const byObject = {
      Hero: {
        material: {
          map: {type: 'image', id: 'texture.png'},
          color: {r: 1, g: 0, b: 0, a: 1},
        },
      },
    }

    stripImageAssetsFromAhistoricStaticOverrides(byObject)

    expect(byObject).toEqual({
      Hero: {
        material: {
          color: {r: 1, g: 0, b: 0, a: 1},
        },
      },
    })
  })
})
