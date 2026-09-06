import React from 'react'
import styled from 'styled-components'

import type {PropTypeConfig_AllSimples} from '@unseenco/theatre-core/propTypes'
import type {ISimplePropEditorReactProps} from '@unseenco/theatre-studio/propEditors/simpleEditors/ISimplePropEditorReactProps'
import {simplePropEditorByPropType} from '@unseenco/theatre-studio/propEditors/simpleEditors/simplePropEditorByPropType'
import type {
  EditingOptionsTree,
  PrimitivePropEditingOptions,
} from './useSingleKeyframeInlineEditorPopover'
import last from 'lodash-es/last'
import {useTempTransactionEditingTools} from './useTempTransactionEditingTools'
import {valueInProp} from '@unseenco/theatre-shared/propTypes/utils'
import {
  getStudioSequence,
  getStudioTrackSequenceVariant,
} from '@unseenco/theatre-studio/utils/activeSequenceVariant'

import {studioChipSurfaceCss} from '@unseenco/theatre-studio/uiComponents/studioTokens'

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  line-height: 13px;
  letter-spacing: 0.01em;
  padding: 6px 4px 4px;
  color: var(--studio-text-muted, #919191);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Row = styled.div`
  display: flex;
  align-items: stretch;
  min-width: 240px;
  padding: 3px 0;
  box-sizing: border-box;

  select {
    min-width: 100px;
  }
`

/** Same Dialkit chip chrome as the details pane (`SingleRowPropEditor`). */
const Chip = styled.div<{
  $ownsLabel: boolean
}>`
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--studio-row-height, 36px);
  height: var(--studio-row-height, 36px);
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: ${(props) => (props.$ownsLabel ? '0' : '0 10px')};
  box-sizing: border-box;
  ${studioChipSurfaceCss};
`

const PropName = styled.div`
  flex: 0 1 auto;
  max-width: 45%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  user-select: none;
  cursor: default;
  font-size: 13px;
  font-weight: 500;
  color: var(--studio-text-label);
`

const InputSlot = styled.div<{
  $fullBleed: boolean
}>`
  display: flex;
  align-items: center;
  align-self: stretch;
  box-sizing: border-box;
  min-height: var(--studio-row-height, 36px);
  height: 100%;
  min-width: 0;
  ${(props) =>
    props.$fullBleed
      ? `
    flex: 1 1 auto;
    width: 100%;
    justify-content: stretch;
  `
      : `
    flex: 1 1 auto;
    justify-content: flex-end;
  `}
`

const INDENT_PX = 10

function editorOwnsLabel(propType: string): boolean {
  return propType === 'number'
}

/**
 * Given a propConfig, this function gives the corresponding prop editor for
 * use in the dope sheet inline prop editor on a keyframe.
 * {@link DeterminePropEditorForDetail} does the same thing for the details panel. The main difference
 * between this function and {@link DeterminePropEditorForDetail} is that this
 * one shows prop editors *without* keyframe navigation controls (that look
 * like `< ・ >`).
 *
 * @param p - propConfig object for any type of prop.
 */
export function DeterminePropEditorForKeyframeTree(
  p: EditingOptionsTree & {autoFocusInput?: boolean; indent: number},
) {
  if (p.type === 'sheetObject') {
    return (
      <>
        <SectionLabel style={{paddingLeft: `${p.indent * INDENT_PX}px`}}>
          {p.sheetObject.address.objectKey}
        </SectionLabel>
        {p.children.map((c, i) => (
          <DeterminePropEditorForKeyframeTree
            key={i}
            {...c}
            autoFocusInput={p.autoFocusInput && i === 0}
            indent={p.indent + 1}
          />
        ))}
      </>
    )
  } else if (p.type === 'propWithChildren') {
    const label = p.propConfig.label ?? last(p.pathToProp)
    return (
      <>
        <SectionLabel style={{paddingLeft: `${p.indent * INDENT_PX}px`}}>
          {label}
        </SectionLabel>
        {p.children.map((c, i) => (
          <DeterminePropEditorForKeyframeTree
            key={i}
            {...c}
            autoFocusInput={p.autoFocusInput && i === 0}
            indent={p.indent + 1}
          />
        ))}
      </>
    )
  } else {
    return (
      <PrimitivePropEditor
        {...p}
        autoFocusInput={p.autoFocusInput}
        indent={p.indent}
      />
    )
  }
}

function PrimitivePropEditor(
  p: PrimitivePropEditingOptions & {autoFocusInput?: boolean; indent: number},
) {
  const label = p.propConfig.label ?? last(p.pathToProp)
  const editingTools = useEditingToolsForKeyframeEditorPopover(p)
  const labelText = typeof label === 'string' ? label : String(label ?? '')

  if (p.propConfig.type === 'enum') {
    // notice: enums are not implemented, yet.
    return <></>
  }

  const PropEditor = simplePropEditorByPropType[
    p.propConfig.type
  ] as React.VFC<ISimplePropEditorReactProps<PropTypeConfig_AllSimples>>

  const ownsLabel = editorOwnsLabel(p.propConfig.type)

  return (
    <Row style={{paddingLeft: `${p.indent * INDENT_PX}px`}}>
      <Chip data-detail-prop-chip="" $ownsLabel={ownsLabel}>
        {!ownsLabel && <PropName>{labelText}</PropName>}
        <InputSlot $fullBleed={ownsLabel}>
          <PropEditor
            editingTools={editingTools}
            propConfig={p.propConfig}
            value={valueInProp(p.keyframe.value, p.propConfig)}
            autoFocus={p.autoFocusInput}
            {...(ownsLabel ? {label: labelText, embedded: true} : {})}
          />
        </InputSlot>
      </Chip>
    </Row>
  )
}

// These editing tools are distinct from the editing tools used in the
// prop editors in the details panel: These editing tools edit the value of a keyframe
// while the details editing tools edit the value of the sequence at the playhead
// (potentially creating a new keyframe).
function useEditingToolsForKeyframeEditorPopover(
  props: PrimitivePropEditingOptions,
) {
  const obj = props.sheetObject
  return useTempTransactionEditingTools(({stateEditors}, value) => {
    const newKeyframe = {...props.keyframe, value}
    stateEditors.coreByProject.historic.sheetsById.sequence.replaceKeyframes({
      ...obj.address,
      trackId: props.trackId,
      keyframes: [newKeyframe],
      snappingFunction: getStudioSequence(obj.sheet).closestGridPosition,
      sequenceVariant: getStudioTrackSequenceVariant(obj, props.trackId),
    })
  }, obj)
}
