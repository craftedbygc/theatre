import {
  isDirectAssetUrl,
  stripImageAssetsFromAhistoricStaticOverrides,
} from './assets'

describe('isDirectAssetUrl', () => {
  it('returns true for absolute and path-like urls', () => {
    expect(isDirectAssetUrl('https://example.com/a.png')).toBe(true)
    expect(isDirectAssetUrl('http://localhost:8080/textures/noise.jpg')).toBe(
      true,
    )
    expect(isDirectAssetUrl('blob:https://example.com/uuid')).toBe(true)
    expect(isDirectAssetUrl('data:image/png;base64,abc')).toBe(true)
    expect(isDirectAssetUrl('./textures/noise.jpg')).toBe(true)
    expect(isDirectAssetUrl('/assets/texture.png')).toBe(true)
  })

  it('returns false for Theatre-managed filenames', () => {
    expect(isDirectAssetUrl('texture.png')).toBe(false)
    expect(isDirectAssetUrl('My image.png')).toBe(false)
  })
})

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
