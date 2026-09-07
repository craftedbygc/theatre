// Pretty much same code as for keyframe and similar for playhead.
// Consider if we should unify the implementations.
// - See "useLockFrameStampPosition"
// - Also see "pointerPositionInUnitSpace" for a related impl (for different problem)
const POSITION_SNAP_ATTR = 'data-pos'

function findSnapTargetFromElement(
  start: Element | null,
  ignore?: Element | null,
): Element | null {
  let el: Element | null = start
  while (el) {
    if (el !== ignore && el.hasAttribute(POSITION_SNAP_ATTR)) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/**
 * Uses `[data-pos]` attribute to understand potential snap targets.
 */
const DopeSnap = {
  checkIfMouseEventSnapToPos(
    event: MouseEvent,
    options?: {ignore?: Element | null},
  ): number | null {
    // Prefer hit-testing under the cursor. During pointer capture, composedPath()
    // points at the capture target rather than the element under the pointer.
    const underCursor = document.elementFromPoint(event.clientX, event.clientY)
    let snapTarget = findSnapTargetFromElement(underCursor, options?.ignore)

    if (!snapTarget) {
      snapTarget =
        event
          .composedPath()
          .find(
            (el): el is Element =>
              el instanceof Element &&
              el !== options?.ignore &&
              el.hasAttribute(POSITION_SNAP_ATTR),
          ) ?? null
    }

    if (snapTarget) {
      const snapPos = parseFloat(snapTarget.getAttribute(POSITION_SNAP_ATTR)!)
      if (isFinite(snapPos)) {
        return snapPos
      }
    }

    return null
  },

  /**
   * Use as a spread in a React element
   *
   * @example
   * ```tsx
   * <div {...DopeSnap.includePositionSnapAttrs(10)}/>
   * ```
   */
  includePositionSnapAttrs(position: number) {
    return {[POSITION_SNAP_ATTR]: position}
  },
}

export default DopeSnap
