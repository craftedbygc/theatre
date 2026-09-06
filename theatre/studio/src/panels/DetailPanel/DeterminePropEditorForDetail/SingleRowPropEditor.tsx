import type * as propTypes from '@unseenco/theatre-core/propTypes'
import {getPointerParts} from '@unseenco/theatre-dataverse'
import type {Pointer, Prism} from '@unseenco/theatre-dataverse'
import {last} from 'lodash-es'
import React from 'react'
import type {useEditingToolsForSimplePropInDetailsPanel} from '@unseenco/theatre-studio/propEditors/useEditingToolsForSimpleProp'
import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import type {PropHighlighted} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/whatPropIsHighlighted'
import {rowIndentationFormulaCSS} from './rowIndentationFormulaCSS'
import {useVal} from '@unseenco/theatre-react'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'
import type {$FixMe} from '@unseenco/theatre-shared/utils/types'
import {studioChipSurfaceCss} from '@unseenco/theatre-studio/uiComponents/studioTokens'

const Container = styled.div<{
  isHighlighted: PropHighlighted
}>`
  display: flex;
  min-height: var(--studio-row-height);
  justify-content: flex-start;
  align-items: stretch;
  gap: 6px;
  padding: 0 8px 0 0;
  position: relative;
  box-sizing: border-box;
  ${pointerEventsAutoInNormalMode};
`

const Gutter = styled.div`
  box-sizing: border-box;
  padding-left: ${rowIndentationFormulaCSS};
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex: 0 0 auto;
  min-width: 18px;
  line-height: 0;
`

const Chip = styled.div<{
  $ownsLabel: boolean
  isHighlighted: PropHighlighted
}>`
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--studio-row-height);
  height: var(--studio-row-height);
  display: flex;
  align-items: ${(props) => (props.$ownsLabel ? 'stretch' : 'center')};
  gap: 12px;
  padding: ${(props) => (props.$ownsLabel ? '0' : '0 10px')};
  box-sizing: border-box;
  ${studioChipSurfaceCss};
  ${(props) =>
    props.isHighlighted === 'self'
      ? 'background: var(--studio-surface-active);'
      : props.isHighlighted === 'descendent'
      ? 'background: var(--studio-surface-hover);'
      : ''}
`

const PropName = styled.div<{
  isHighlighted: PropHighlighted
  $isTransient?: boolean
}>`
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
  color: ${(props) =>
    props.isHighlighted === 'self'
      ? 'var(--studio-text-focus)'
      : 'var(--studio-text-label)'};
  ${(props) => (props.$isTransient ? 'font-style: italic;' : '')}

  &:hover {
    color: var(--studio-text-focus);
  }
`

const InputSlot = styled.div<{
  $fullBleed: boolean
}>`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: var(--studio-row-height);
  min-width: 0;
  ${(props) =>
    props.$fullBleed
      ? `
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    justify-content: stretch;
  `
      : `
    flex: 1 1 auto;
    justify-content: flex-end;
  `}
`

type ISingleRowPropEditorProps<T> = {
  propConfig: propTypes.PropTypeConfig
  pointerToProp: Pointer<T>
  editingTools: ReturnType<typeof useEditingToolsForSimplePropInDetailsPanel>
  isPropHighlightedD: Prism<PropHighlighted>
  objectKey: string
  isTransient?: boolean
}

function editorOwnsLabel(propConfig: propTypes.PropTypeConfig): boolean {
  return propConfig.type === 'number'
}

export function SingleRowPropEditor<T>({
  propConfig,
  pointerToProp,
  editingTools,
  children,
  isPropHighlightedD,
  objectKey,
  isTransient,
}: React.PropsWithChildren<ISingleRowPropEditorProps<T>>): React.ReactElement<
  any,
  any
> | null {
  const label = propConfig.label ?? last(getPointerParts(pointerToProp).path)

  const title = [
    objectKey,
    'props',
    ...getPointerParts(pointerToProp).path,
  ].join('.')
  const chordialTitle = isTransient ? `${title} (transient)` : title

  const isHighlighted = useVal(isPropHighlightedD)

  const {targetRef} = useChordial(() => {
    return {
      title: chordialTitle,
      items: editingTools.contextMenuItems,
    }
  })

  const ownsLabel = editorOwnsLabel(propConfig)

  const editor = ownsLabel
    ? React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(
          child as React.ReactElement<{label?: string; embedded?: boolean}>,
          {
            label: typeof label === 'string' ? label : String(label ?? ''),
            embedded: true,
          },
        )
      })
    : children

  return (
    <Container isHighlighted={isHighlighted}>
      <Gutter>{editingTools.controlIndicators}</Gutter>
      <Chip $ownsLabel={ownsLabel} isHighlighted={isHighlighted}>
        {!ownsLabel && (
          <PropName
            isHighlighted={isHighlighted}
            $isTransient={isTransient}
            ref={targetRef as $FixMe}
          >
            {label}
          </PropName>
        )}
        <InputSlot
          $fullBleed={ownsLabel}
          ref={ownsLabel ? (targetRef as $FixMe) : undefined}
        >
          {editor}
        </InputSlot>
      </Chip>
    </Container>
  )
}
