import {
  MeshStandardMaterial,
  RepeatWrapping,
  Texture,
  TextureLoader,
} from 'three'
import {
  copyTextureSettings,
  createTextureSlotApplier,
  isMaterialTextureProp,
  isUniformTextureProp,
  textureToDefaultAssetId,
  __testOnly_setTextureRepeatWrapping,
} from './textureUtils'

describe('textureUtils', () => {
  describe('isMaterialTextureProp', () => {
    it('returns true for assigned textures', () => {
      const material = new MeshStandardMaterial()
      const texture = new Texture()
      material.map = texture

      expect(isMaterialTextureProp(material, 'map', texture)).toBe(true)
    })

    it('returns true for null texture slots on the material', () => {
      const material = new MeshStandardMaterial()
      material.map = null

      expect(isMaterialTextureProp(material, 'map', null)).toBe(true)
    })

    it('returns false for non-texture null properties', () => {
      const material = new MeshStandardMaterial()

      expect(isMaterialTextureProp(material, 'color', null)).toBe(false)
    })
  })

  describe('isUniformTextureProp', () => {
    it('returns true for texture uniform values', () => {
      const texture = new Texture()
      expect(isUniformTextureProp('uDiffuseMap', texture)).toBe(true)
    })

    it('returns true for null uniforms with texture-like names', () => {
      expect(isUniformTextureProp('uDiffuseMap', null)).toBe(true)
      expect(isUniformTextureProp('tDiffuse', null)).toBe(true)
    })

    it('returns false for null non-texture uniforms', () => {
      expect(isUniformTextureProp('uTime', null)).toBe(false)
    })

    it('returns true when gui declares a texture uniform', () => {
      expect(
        isUniformTextureProp('uCustom', null, {
          value: null,
          gui: {type: 'texture'},
        }),
      ).toBe(true)
    })
  })

  describe('copyTextureSettings', () => {
    it('copies wrapping and repeat settings', () => {
      const from = new Texture()
      __testOnly_setTextureRepeatWrapping(from)
      from.repeat.set(2, 3)

      const to = new Texture()
      copyTextureSettings(from, to)

      expect(to.wrapS).toBe(RepeatWrapping)
      expect(to.wrapT).toBe(RepeatWrapping)
      expect(to.repeat.x).toBe(2)
      expect(to.repeat.y).toBe(3)
    })
  })

  describe('textureToDefaultAssetId', () => {
    it('extracts the basename from an image src', () => {
      const texture = new Texture()
      texture.image = {src: 'https://example.com/assets/texture.png'}

      expect(textureToDefaultAssetId(texture)).toBe('texture.png')
    })

    it('returns an empty string when no src is available', () => {
      const texture = new Texture()
      expect(textureToDefaultAssetId(texture)).toBe('')
    })
  })

  describe('createTextureSlotApplier', () => {
    const originalLoad = TextureLoader.prototype.load

    afterEach(() => {
      TextureLoader.prototype.load = originalLoad
    })

    it('clears the slot when the asset id is empty', () => {
      const owner = {}
      let current: Texture | null = new Texture()
      let assignCount = 0

      const applyTexture = createTextureSlotApplier(() => 'unused')

      applyTexture(
        owner,
        'map',
        {type: 'image', id: undefined},
        () => current,
        (texture) => {
          assignCount += 1
          current = texture
        },
      )

      expect(current).toBeNull()
      expect(assignCount).toBe(1)

      applyTexture(
        owner,
        'map',
        {type: 'image', id: undefined},
        () => current,
        (texture) => {
          assignCount += 1
          current = texture
        },
      )

      expect(assignCount).toBe(1)
    })

    it('copies settings from the existing texture when loading a new one', () => {
      const owner = {}
      const existing = new Texture()
      __testOnly_setTextureRepeatWrapping(existing)
      existing.repeat.set(4, 5)

      let current: Texture | null = existing
      let assigned: Texture | null = null
      let loadCount = 0

      TextureLoader.prototype.load = function load(
        _url: string,
        onLoad: (texture: Texture) => void,
      ) {
        loadCount += 1
        onLoad(new Texture())
      } as typeof TextureLoader.prototype.load

      const applyTexture = createTextureSlotApplier(() => '/texture.png')
      const asset = {type: 'image' as const, id: 'texture.png'}

      applyTexture(
        owner,
        'map',
        asset,
        () => current,
        (texture) => {
          assigned = texture
          current = texture
        },
      )

      expect(loadCount).toBe(1)
      expect(assigned).not.toBeNull()
      expect(assigned!.wrapS).toBe(RepeatWrapping)
      expect(assigned!.wrapT).toBe(RepeatWrapping)
      expect(assigned!.repeat.x).toBe(4)
      expect(assigned!.repeat.y).toBe(5)

      applyTexture(
        owner,
        'map',
        asset,
        () => current,
        (texture) => {
          assigned = texture
          current = texture
        },
      )

      expect(loadCount).toBe(1)
    })
  })
})
