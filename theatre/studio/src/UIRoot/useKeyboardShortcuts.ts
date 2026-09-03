import {useEffect} from 'react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {cmdIsDown} from '@unseenco/theatre-studio/utils/keyboardUtils'
import {getSelectedSequence} from '@unseenco/theatre-studio/selectors'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {toggleSequencePlayback} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/PlaybackControls/sequencePlayback'

export {getIsPlayheadAttachedToFocusRange} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/PlaybackControls/sequencePlayback'

let playPauseKeyboardShortcutIsEnabled = true
export function __experimental_disblePlayPauseKeyboardShortcut() {
  playPauseKeyboardShortcutIsEnabled = false
}

export function __experimental_enablePlayPauseKeyboardShortcut() {
  playPauseKeyboardShortcutIsEnabled = true
}

let visibilityToggleKeyboardShortcutIsEnabled = true
export function disableVisibilityToggleKeyboardShortcut() {
  visibilityToggleKeyboardShortcutIsEnabled = false
}

export function enableVisibilityToggleKeyboardShortcut() {
  visibilityToggleKeyboardShortcutIsEnabled = true
}

/**
 * True when the event target is a text-editable field where browser-native
 * editing shortcuts (e.g. Ctrl+Z for text) should take precedence over
 * studio shortcuts. Non-text inputs like checkboxes must not block undo/redo.
 */
function isTextEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  if (target.tagName === 'TEXTAREA') return true

  if (target.tagName === 'INPUT') {
    const type = (target as HTMLInputElement).type
    return (
      type !== 'checkbox' &&
      type !== 'radio' &&
      type !== 'button' &&
      type !== 'submit' &&
      type !== 'reset' &&
      type !== 'file' &&
      type !== 'color' &&
      type !== 'range'
    )
  }

  return target.isContentEditable
}

export default function useKeyboardShortcuts() {
  const studio = getStudio()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target: null | HTMLElement =
        e.composedPath()[0] as unknown as $IntentionalAny
      if (isTextEditableTarget(target)) {
        return
      }

      if (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') {
        if (cmdIsDown(e)) {
          if (e.shiftKey === true) {
            studio.redo()
          } else {
            studio.undo()
          }
        } else {
          return
        }
      } else if (
        e.code === 'Space' &&
        !e.shiftKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.ctrlKey
      ) {
        if (!playPauseKeyboardShortcutIsEnabled) return
        const seq = getSelectedSequence()
        if (seq) {
          toggleSequencePlayback(seq)
        } else {
          return
        }
      }
      // alt + \
      else if (
        e.altKey &&
        (e.key === '\\' || e.code === 'Backslash' || e.code === 'IntlBackslash')
      ) {
        if (!visibilityToggleKeyboardShortcutIsEnabled) return
        studio.transaction(({stateEditors, drafts}) => {
          stateEditors.studio.ahistoric.setVisibilityState(
            drafts.ahistoric.visibilityState === 'everythingIsHidden'
              ? 'everythingIsVisible'
              : 'everythingIsHidden',
          )
        })
      } else {
        return
      }

      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
