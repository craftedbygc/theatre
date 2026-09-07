import React from 'react'
import styled from 'styled-components'
import usePopover from '@unseenco/theatre-studio/uiComponents/Popover/usePopover'
import BasicPopover from '@unseenco/theatre-studio/uiComponents/Popover/BasicPopover'
import {DeterminePropEditorForKeyframeTree} from './DeterminePropEditorForSingleKeyframe'
import type {SequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import type {Keyframe} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {
  PropTypeConfig_AllSimples,
  PropTypeConfig_Compound,
  PropTypeConfig_Enum,
} from '@unseenco/theatre-core/propTypes'
import type {PathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type {UnknownValidCompoundProps} from '@unseenco/theatre-core/propTypes/internals'

/**
 * The popover *is* the edit chip: same fill as the chip, arrow in that color,
 * no outer chrome around a nested chip.
 */
const KeyframeInlineEditorPopover = styled(BasicPopover)`
  --popover-bg: var(--studio-chip-bg, #393c40);
  --popover-outer-stroke: var(--studio-chip-bg, #393c40);
  --popover-inner-stroke: var(--studio-chip-bg, #393c40);

  background: var(--studio-chip-bg, #393c40);
  border: none;
  border-radius: var(--studio-radius, 4px);
  padding: 0;
  overflow: visible;
`

/** The editor that pops up when directly clicking a Keyframe. */
export function useKeyframeInlineEditorPopover(
  props: EditingOptionsTree[] | null,
) {
  return usePopover({debugName: 'useKeyframeInlineEditorPopover'}, () => (
    <KeyframeInlineEditorPopover showPopoverEdgeTriangle>
      {!Array.isArray(props)
        ? undefined
        : props.map((prop, i) => (
            <DeterminePropEditorForKeyframeTree
              key={i}
              {...prop}
              // Don't autofocus the value — leave the popover ready for scrub
              // or a deliberate click-to-type on the value.
              indent={0}
            />
          ))}
    </KeyframeInlineEditorPopover>
  ))
}

export type EditingOptionsTree =
  | SheetObjectEditingOptionsTree
  | PropWithChildrenEditingOptionsTree
  | PrimitivePropEditingOptions
export type SheetObjectEditingOptionsTree = {
  type: 'sheetObject'
  sheetObject: SheetObject
  children: EditingOptionsTree[]
}
export type PropWithChildrenEditingOptionsTree = {
  type: 'propWithChildren'
  propConfig: PropTypeConfig_Compound<UnknownValidCompoundProps>
  pathToProp: PathToProp
  children: EditingOptionsTree[]
}
export type PrimitivePropEditingOptions = {
  type: 'primitiveProp'
  keyframe: Keyframe
  propConfig: PropTypeConfig_AllSimples | PropTypeConfig_Enum // note: enums are not implemented yet
  sheetObject: SheetObject
  trackId: SequenceTrackId
  pathToProp: PathToProp
}
