import {theme} from '@unseenco/theatre-studio/css'
import type {
  SequenceEditorTree_PrimitiveProp,
  SequenceEditorTree_PropWithChildren,
  SequenceEditorTree_Sheet,
  SequenceEditorTree_SheetObject,
} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/tree'
import type {VoidFn} from '@unseenco/theatre-shared/utils/types'
import React, {useRef} from 'react'
import {HiOutlineChevronRight} from 'react-icons/all'
import styled from 'styled-components'
import {propNameTextCSS} from '@unseenco/theatre-studio/propEditors/utils/propNameTextCSS'
import {usePropHighlightMouseEnter} from './usePropHighlightMouseEnter'

export const LeftRowContainer = styled.li<{depth: number}>`
  --depth: ${(props) => props.depth};
  margin: 0;
  padding: 0;
  list-style: none;
`

export const BaseHeader = styled.div<{isEven: boolean}>`
  border-bottom: 1px solid #7695b705;
`

const LeftRowHeader = styled(BaseHeader)<{
  isSelectable: boolean
  isSelected: boolean
}>`
  padding-left: calc(0px + var(--depth) * 20px);

  display: flex;
  align-items: stretch;
  color: ${theme.panel.body.compoudThing.label.color};

  box-sizing: border-box;

  ${(props) => props.isSelected && `background: blue`};
`

const LeftRowHead_Label = styled.span`
  ${propNameTextCSS};
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 2px;
  line-height: 26px;
  flex: 0 1 auto;
  min-width: 0;

  ${LeftRowHeader}:hover & {
    color: #ccc;
  }
`

/** Collapse control sits to the right of the name (same pattern as the details pane). */
const LeftRowHead_Icon = styled.span<{isCollapsed: boolean}>`
  width: 18px;
  height: 26px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  cursor: pointer;

  transition: transform 0.05s ease-out, color 0.1s ease-out, opacity 0.1s ease-out;
  transform: rotateZ(${(props) => (props.isCollapsed ? 0 : 90)}deg);
  color: #8b8e92;
  opacity: ${(props) => (props.isCollapsed ? 1 : 0.7)};

  ${LeftRowHeader}:hover & {
    opacity: 1;
  }

  &:hover {
    transform: rotateZ(${(props) => (props.isCollapsed ? 15 : 75)}deg);
    color: #c0c4c9;
  }
`

const LeftRowChildren = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

const AnyCompositeRow: React.FC<{
  leaf:
    | SequenceEditorTree_Sheet
    | SequenceEditorTree_PrimitiveProp
    | SequenceEditorTree_PropWithChildren
    | SequenceEditorTree_SheetObject
  label: React.ReactNode
  toggleSelect?: VoidFn
  toggleCollapsed: VoidFn
  isSelected?: boolean
  isSelectable?: boolean
  isCollapsed: boolean
  children?: React.ReactNode
}> = ({
  leaf,
  label,
  children,
  isSelectable,
  isSelected,
  toggleSelect,
  toggleCollapsed,
  isCollapsed,
}) => {
  const hasChildren = Array.isArray(children) && children.length > 0

  const rowHeaderRef = useRef<HTMLDivElement | null>(null)

  usePropHighlightMouseEnter(rowHeaderRef.current, leaf)

  return leaf.shouldRender ? (
    <LeftRowContainer depth={leaf.depth}>
      <LeftRowHeader
        ref={rowHeaderRef}
        style={{
          height: leaf.nodeHeight + 'px',
        }}
        isSelectable={isSelectable === true}
        isSelected={isSelected === true}
        onClick={toggleSelect}
        isEven={leaf.n % 2 === 0}
      >
        <LeftRowHead_Label>{label}</LeftRowHead_Label>
        <LeftRowHead_Icon
          isCollapsed={isCollapsed}
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapsed()
          }}
        >
          <HiOutlineChevronRight />
        </LeftRowHead_Icon>
      </LeftRowHeader>
      {hasChildren && <LeftRowChildren>{children}</LeftRowChildren>}
    </LeftRowContainer>
  ) : null
}

export default AnyCompositeRow
