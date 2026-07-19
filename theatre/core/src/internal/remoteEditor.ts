/**
 * A window is considered the "remote editor" for a project when its URL
 * contains the `editor` hash, e.g. `https://myapp.com/#editor`. Every other
 * window is a listener that mirrors whatever the editor window broadcasts.
 *
 * This convention is shared with `@unseenco/theatre-studio`'s "Open remote editor
 * window" toolbar button, which opens a popup at the current URL with this
 * hash set.
 */
export function isRemoteEditorWindow(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.location.hash.indexOf('editor') !== -1
  )
}
