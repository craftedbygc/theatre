import type {IRange} from '@unseenco/theatre-shared/utils/types'
import {clamp} from 'lodash-es'

/** Matches pinch-zoom max extent in HorizontallyScrollableArea. */
const ZOOM_OUT_LENGTH_PADDING = 0.25

export function getZoomExtents(
  sequenceLength: number,
  subUnitsPerUnit: number,
): {minWidth: number; maxWidth: number} {
  const maxWidth = Math.max(sequenceLength * (1 + ZOOM_OUT_LENGTH_PADDING), 1)
  const minWidth = Math.max(1 / Math.max(subUnitsPerUnit, 1), 0.001)
  return {minWidth, maxWidth}
}

/**
 * Maps visible range width to a 0..1 zoom level (0 = zoomed out, 1 = zoomed in)
 * using a logarithmic scale so mid-slider feels natural.
 */
export function zoomLevelFromRange(
  range: IRange,
  sequenceLength: number,
  subUnitsPerUnit: number,
): number {
  const {minWidth, maxWidth} = getZoomExtents(sequenceLength, subUnitsPerUnit)
  if (maxWidth <= minWidth) return 0

  const width = clamp(range.end - range.start, minWidth, maxWidth)
  return Math.log(width / maxWidth) / Math.log(minWidth / maxWidth)
}

/**
 * Builds a new clipped-space range for the given zoom level, keeping the
 * current viewport center fixed when possible.
 */
export function rangeFromZoomLevel(
  zoom: number,
  currentRange: IRange,
  sequenceLength: number,
  subUnitsPerUnit: number,
): IRange {
  const {minWidth, maxWidth} = getZoomExtents(sequenceLength, subUnitsPerUnit)
  const t = clamp(zoom, 0, 1)
  const newWidth =
    maxWidth <= minWidth
      ? maxWidth
      : maxWidth * Math.pow(minWidth / maxWidth, t)

  const center = (currentRange.start + currentRange.end) / 2
  let start = center - newWidth / 2
  let end = center + newWidth / 2

  if (start < 0) {
    start = 0
    end = newWidth
  }
  if (end > maxWidth) {
    end = maxWidth
    start = Math.max(0, maxWidth - newWidth)
  }

  return {start, end}
}
