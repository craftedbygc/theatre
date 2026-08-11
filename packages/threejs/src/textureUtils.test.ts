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
    it('uses the image src as the default asset id', () => {
      const texture = new Texture()
      texture.image = {src: 'https://example.com/assets/texture.png'}

      expect(textureToDefaultAssetId(texture)).toBe(
        'https://example.com/assets/texture.png',
      )
    })

    it('preserves relative image srcs', () => {
      const texture = new Texture()
      texture.image = {src: './textures/noise.jpg'}

      expect(textureToDefaultAssetId(texture)).toBe('./textures/noise.jpg')
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

    it('preserves an existing non-Theatre texture on initial empty sync', () => {
      const owner = {}
      const procedural = new Texture()
      let current: Texture | null = procedural
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

      expect(current).toBe(procedural)
      expect(assignCount).toBe(0)

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

      expect(current).toBe(procedural)
      expect(assignCount).toBe(0)
    })

    it('clears the slot when a Theatre asset is removed', () => {
      const owner = {}
      let current: Texture | null = new Texture()
      let assignCount = 0

      TextureLoader.prototype.load = function load(
        _url: string,
        onLoad: (texture: Texture) => void,
      ) {
        onLoad(new Texture())
      } as typeof TextureLoader.prototype.load

      const applyTexture = createTextureSlotApplier(() => '/texture.png')

      // First sync with an existing map only records the default id.
      applyTexture(
        owner,
        'map',
        {type: 'image', id: 'texture.png'},
        () => current,
        (texture) => {
          assignCount += 1
          current = texture
        },
      )

      expect(current).not.toBeNull()
      expect(assignCount).toBe(0)

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

    it('loads when a Theatre asset is assigned after the slot was empty', () => {
      const owner = {}
      let current: Texture | null = null
      let assignCount = 0
      let loadCount = 0

      TextureLoader.prototype.load = function load(
        _url: string,
        onLoad: (texture: Texture) => void,
      ) {
        loadCount += 1
        onLoad(new Texture())
      } as typeof TextureLoader.prototype.load

      const applyTexture = createTextureSlotApplier(() => '/texture.png')

      applyTexture(
        owner,
        'map',
        {type: 'image', id: 'texture.png'},
        () => current,
        (texture) => {
          assignCount += 1
          current = texture
        },
      )

      expect(loadCount).toBe(1)
      expect(assignCount).toBe(1)
      expect(current).not.toBeNull()
    })

    it('preserves an existing texture on first sync with a default asset id', () => {
      const owner = {}
      const existing = new Texture()
      let current: Texture | null = existing
      let loadCount = 0

      TextureLoader.prototype.load = function load(
        _url: string,
        onLoad: (texture: Texture) => void,
      ) {
        loadCount += 1
        onLoad(new Texture())
      } as typeof TextureLoader.prototype.load

      const applyTexture = createTextureSlotApplier(() => '/noise.jpg')
      const asset = {type: 'image' as const, id: 'noise.jpg'}

      applyTexture(
        owner,
        'uDiffuseMap',
        asset,
        () => current,
        (texture) => {
          current = texture
        },
      )

      expect(loadCount).toBe(0)
      expect(current).toBe(existing)

      // Unrelated prop edits re-deliver the same image id — still no reload.
      applyTexture(
        owner,
        'uDiffuseMap',
        asset,
        () => current,
        (texture) => {
          current = texture
        },
      )

      expect(loadCount).toBe(0)
      expect(current).toBe(existing)
    })

    it('does not retry when getAssetUrl returns undefined', () => {
      const owner = {}
      let current: Texture | null = null
      let loadCount = 0

      TextureLoader.prototype.load = function load(
        _url: string,
        onLoad: (texture: Texture) => void,
      ) {
        loadCount += 1
        onLoad(new Texture())
      } as typeof TextureLoader.prototype.load

      const applyTexture = createTextureSlotApplier(() => undefined)
      const asset = {type: 'image' as const, id: 'missing.png'}

      applyTexture(
        owner,
        'map',
        asset,
        () => current,
        (texture) => {
          current = texture
        },
      )
      applyTexture(
        owner,
        'map',
        asset,
        () => current,
        (texture) => {
          current = texture
        },
      )

      expect(loadCount).toBe(0)
      expect(current).toBeNull()
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

      const applyTexture = createTextureSlotApplier((asset) => `/${asset.id}`)

      // Establish a prior Theatre assignment so the next id is a real change.
      applyTexture(
        owner,
        'map',
        {type: 'image', id: 'first.png'},
        () => current,
        (texture) => {
          current = texture
        },
      )
      expect(loadCount).toBe(0)
      expect(current).toBe(existing)

      applyTexture(
        owner,
        'map',
        {type: 'image', id: 'texture.png'},
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
        {type: 'image', id: 'texture.png'},
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
