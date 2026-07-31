import {Atom, val} from '@unseenco/theatre-dataverse'
import {DOCKED_TOOLBAR_HEIGHT} from './dockedLayoutConstants'

export const dockedToolbarHeightB = new Atom(DOCKED_TOOLBAR_HEIGHT)

export function setDockedToolbarHeight(height: number) {
  const rounded = Math.ceil(height)
  if (val(dockedToolbarHeightB.prism) === rounded) return
  dockedToolbarHeightB.set(rounded)
}

export function resetDockedToolbarHeight() {
  if (val(dockedToolbarHeightB.prism) === DOCKED_TOOLBAR_HEIGHT) return
  dockedToolbarHeightB.set(DOCKED_TOOLBAR_HEIGHT)
}
