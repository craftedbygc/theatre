// Studio UI reads core sequence-variant state via these helpers.
// Mutations belong in stateEditors.ts instead.
// eslint-disable-next-line no-restricted-syntax
import {
  DEFAULT_SEQUENCE_VARIANT,
  getSequenceStateFromSheet,
  getSequenceVariantOwningTrackInSheetState,
  isObjectAssignedToSequenceVariant,
  valTracksByObjectForSheetVariant,
} from '@unseenco/theatre-core/sequences/sequenceVariants'

export {
  DEFAULT_SEQUENCE_VARIANT,
  getSequenceStateFromSheet,
  getSequenceVariantOwningTrackInSheetState,
  isObjectAssignedToSequenceVariant,
  valTracksByObjectForSheetVariant,
}
