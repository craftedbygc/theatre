import getStudio from './getStudio'
import {
  disableVisibilityToggleKeyboardShortcut,
  enableVisibilityToggleKeyboardShortcut,
} from './UIRoot/useKeyboardShortcuts'

/**
 * A window is considered the "remote editor" when its URL contains the
 * `editor` hash. Mirrors `@unseenco/theatre-core`'s `isRemoteEditorWindow()`.
 */
export function isRemoteEditorWindow(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.location.hash.indexOf('editor') !== -1
  )
}

let remoteEditorWindow: Window | null = null
let pollIntervalId: number | undefined

const listeners = new Set<(isOpen: boolean) => void>()

function notifyListeners() {
  const isOpen = isRemoteEditorOpen()
  for (const listener of listeners) {
    listener(isOpen)
  }
}

/**
 * Returns `true` when this browser window has opened a remote editor popup that
 * is still open. Always `false` inside the remote editor window itself.
 */
export function isRemoteEditorOpen(): boolean {
  return remoteEditorWindow !== null && !remoteEditorWindow.closed
}

/**
 * Subscribe to changes in {@link isRemoteEditorOpen}. The listener is called
 * immediately with the current value.
 */
export function onRemoteEditorOpenChange(
  listener: (isOpen: boolean) => void,
): () => void {
  listeners.add(listener)
  listener(isRemoteEditorOpen())
  return () => {
    listeners.delete(listener)
  }
}

export function openRemoteEditorWindow(): void {
  if (isRemoteEditorOpen()) {
    remoteEditorWindow!.focus()
    return
  }

  const url = new URL(window.location.href)
  url.hash = 'editor'
  // Note: no noopener/noreferrer, since we need the returned reference to
  // detect when the popup closes. This is a same-origin popup of the app's
  // own URL, not a third-party link, so the tabnabbing risk doesn't apply.
  const width = Math.round(window.outerWidth * 0.6)
  const height = Math.round(window.outerHeight * 0.6)
  const openerLeft = window.screenX ?? window.screenLeft ?? 0
  const openerTop = window.screenY ?? window.screenTop ?? 0
  const left = Math.round(openerLeft + (window.outerWidth - width) / 2)
  const top = Math.round(openerTop + (window.outerHeight - height) / 2)
  remoteEditorWindow = window.open(
    url.toString(),
    'theatre-remote-editor',
    `popup=1,width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`,
  )
  if (!remoteEditorWindow) return // popup blocked by the browser

  getStudio().ui.hide()
  disableVisibilityToggleKeyboardShortcut()
  notifyListeners()

  pollIntervalId = window.setInterval(() => {
    if (!remoteEditorWindow || remoteEditorWindow.closed) {
      window.clearInterval(pollIntervalId)
      pollIntervalId = undefined
      remoteEditorWindow = null
      enableVisibilityToggleKeyboardShortcut()
      getStudio().ui.restore()
      notifyListeners()
    }
  }, 500)
}
