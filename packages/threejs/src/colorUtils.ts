import {Color} from 'three'

type TheatreRgba = {r: number; g: number; b: number; a: number}

const tempColor = new Color()

export function colorToTheatreRgba(color: Color): TheatreRgba {
  tempColor.copy(color).convertLinearToSRGB()
  return {
    r: tempColor.r,
    g: tempColor.g,
    b: tempColor.b,
    a: 1,
  }
}

export function applyTheatreRgbaToColor(color: Color, rgba: TheatreRgba): void {
  tempColor.setRGB(rgba.r, rgba.g, rgba.b).convertSRGBToLinear()
  color.copy(tempColor)
}
