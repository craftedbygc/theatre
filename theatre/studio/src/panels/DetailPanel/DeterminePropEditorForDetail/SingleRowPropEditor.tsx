import type * as propTypes from '@unseenco/theatre-core/propTypes'
import {getPointerParts} from '@unseenco/theatre-dataverse'
import type {Pointer, Prism} from '@unseenco/theatre-dataverse'
import {last} from 'lodash-es'
import React from 'react'
import type {useEditingToolsForSimplePropInDetailsPanel} from '@unseenco/theatre-studio/propEditors/useEditingToolsForSimpleProp'
import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import {propNameTextCSS} from '@unseenco/theatre-studio/propEditors/utils/propNameTextCSS'
import type {PropHighlighted} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/whatPropIsHighlighted'
import {rowIndentationFormulaCSS} from './rowIndentationFormulaCSS'
import {useVal} from '@unseenco/theatre-react'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'
import type {$FixMe} from '@unseenco/theatre-shared/utils/types'

const Container = styled.div<{
  isHighlighted: PropHighlighted
}>`
  display: flex;
  height: 30px;
  justify-content: flex-start;
  align-items: stretch;
  --right-width: 40%;
  position: relative;
  ${pointerEventsAutoInNormalMode};
`

const Left = styled.div`
  box-sizing: border-box;
  padding-left: ${rowIndentationFormulaCSS};
  padding-right: 4px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: stretch;
  gap: 4px;
  flex-grow: 0;
  flex-shrink: 0;
  width: calc(100% - var(--right-width));
`

const PropNameContainer = styled.div<{
  isHighlighted: PropHighlighted
  $isTransient?: boolean
}>`
  text-align: left;
  flex: 1 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  user-select: none;
  cursor: default;

  ${propNameTextCSS};
  ${(props) => (props.$isTransient ? 'font-style: italic;' : '')}
  &:hover {
    color: white;
  }
`

const ControlsContainer = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  line-height: 0;
`

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: stretch;
  padding: 0 8px 0 2px;
  box-sizing: border-box;
  height: 100%;
  width: var(--right-width);
  flex-shrink: 0;
  flex-grow: 0;
`

type ISingleRowPropEditorProps<T> = {
  propConfig: propTypes.PropTypeConfig
  pointerToProp: Pointer<T>
  editingTools: ReturnType<typeof useEditingToolsForSimplePropInDetailsPanel>
  isPropHighlightedD: Prism<PropHighlighted>
  objectKey: string
  isTransient?: boolean
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

  return (
    <Container isHighlighted={isHighlighted}>
      <Left>
        <ControlsContainer>{editingTools.controlIndicators}</ControlsContainer>
        <PropNameContainer
          isHighlighted={isHighlighted}
          $isTransient={isTransient}
          ref={targetRef as $FixMe}
        >
          {label}
        </PropNameContainer>
      </Left>

      <InputContainer>{children}</InputContainer>
    </Container>
  )
}
