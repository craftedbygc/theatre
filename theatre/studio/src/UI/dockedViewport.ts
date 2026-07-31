import type {VoidFn} from '@unseenco/theatre-shared/utils/types'
import type {DockedPageViewportRect} from '@unseenco/theatre-studio/UIRoot/syncDockedPageViewport'

export type IDockedViewport = DockedPageViewportRect

let currentViewport: IDockedViewport | null = null
let lastReportedDocked = false

const toggleListeners = new Set<(docked: boolean) => void>()
const resizeListeners = new Set<(viewport: IDockedViewport) => void>()

function isSameViewport(
  a: IDockedViewport | null,
  b: IDockedViewport | null,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  )
}

export function getDockedViewport(): IDockedViewport | null {
  return currentViewport
}

export function notifyDockedToggle(docked: boolean) {
  if (lastReportedDocked === docked) return
  lastReportedDocked = docked
  for (const listener of toggleListeners) {
    listener(docked)
  }
}

export function notifyDockedResize(viewport: IDockedViewport | null) {
  if (viewport === null) {
    if (currentViewport === null) return
    currentViewport = null
    for (const listener of resizeListeners) {
      listener(null)
    }
    return
  }

  if (isSameViewport(currentViewport, viewport)) return
  currentViewport = viewport

  for (const listener of resizeListeners) {
    listener(viewport)
  }
}

export function onDockedToggle(listener: (docked: boolean) => void): VoidFn {
  toggleListeners.add(listener)
  listener(lastReportedDocked)
  return () => {
    toggleListeners.delete(listener)
  }
}

export function onDockedResize(
  listener: (viewport: IDockedViewport | null) => void,
): VoidFn {
  resizeListeners.add(listener)
  if (currentViewport) {
    listener(currentViewport)
  }
  return () => {
    resizeListeners.delete(listener)
  }
}
