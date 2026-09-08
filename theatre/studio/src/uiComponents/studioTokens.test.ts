import {
  deriveStudioAccent,
  getStudioAccentCss,
  getStudioAccentHex,
  setStudioAccentHex,
  studioAccent,
  studioAccentHex,
} from './studioTokens'

describe('studio accent tokens', () => {
  afterEach(() => {
    setStudioAccentHex(studioAccentHex)
  })

  test('deriveStudioAccent uses the given hex as the base', () => {
    const palette = deriveStudioAccent('#c026d3')
    expect(palette.base).toBe('#c026d3')
    expect(palette.hover).not.toBe(palette.base)
    expect(palette.soft).not.toBe(palette.base)
  })

  test('setStudioAccentHex updates the live palette and generated CSS', () => {
    expect(getStudioAccentHex()).toBe(studioAccentHex)
    expect(studioAccent.base).toBe(studioAccentHex)

    setStudioAccentHex('#c026d3')

    expect(getStudioAccentHex()).toBe('#c026d3')
    expect(studioAccent.base).toBe('#c026d3')
    expect(getStudioAccentCss()).toContain('--studio-accent: #c026d3;')
  })

  test('setStudioAccentHex rejects non-hex values', () => {
    expect(() => setStudioAccentHex('magenta')).toThrow(/accentHex/)
    expect(() => setStudioAccentHex('#gg0000')).toThrow(/accentHex/)
    expect(getStudioAccentHex()).toBe(studioAccentHex)
  })
})
