import type {VoidFn} from '@unseenco/theatre-shared/utils/types'
import React from 'react'
import styled, {css} from 'styled-components'
import noop from '@unseenco/theatre-shared/utils/noop'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import {ChevronDown, Package} from '@unseenco/theatre-studio/uiComponents/icons'

export const Container = styled.li`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  justify-content: flex-start;
  flex-direction: column;
  align-items: flex-start;
`

export const BaseHeader = styled.div``

const Header = styled(BaseHeader)`
  position: relative;
  margin-top: 2px;
  margin-bottom: 2px;
  margin-left: calc(4px + var(--depth) * 16px);
  padding-left: 4px;
  padding-right: 8px;
  gap: 4px;
  height: 21px;
  line-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  pointer-events: none;
  white-space: nowrap;

  border-radius: var(--studio-radius);
  border: 1px solid var(--studio-border);

  color: rgba(255, 255, 255, 0.9);
  background: var(--studio-panel-bg, #282b2f);

  &.descendant-is-selected {
    background: var(--studio-accent-muted);
  }

  ${pointerEventsAutoInNormalMode};
  &:not(.not-selectable):not(.selected):hover {
    background: #3b3f45;
    border-color: var(--studio-border-hover);
  }

  &:not(.not-selectable):not(.selected):active {
    background: #525860;
    border-color: var(--studio-border-hover);
  }

  &.selected {
    background: var(--studio-accent);
    border-color: var(--studio-border);
  }
`

export const outlineItemFont = css`
  font-weight: 500;
  font-size: 11px;
  & {
  }
`

const Head_Label = styled.span`
  ${outlineItemFont};

  ${pointerEventsAutoInNormalMode};
  display: flex;
  align-items: center;
  box-sizing: border-box;
  line-height: 1;
`

const Head_IconContainer = styled.div`
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  opacity: 0.99;
  line-height: 0;
`

const Head_Icon_WithDescendants = styled.span`
  font-size: 9px;
  position: relative;
  display: block;
  transition: transform 0.1s ease-out;

  &:hover {
    transform: rotate(-20deg);
  }

  ${Container}.collapsed & {
    transform: rotate(-90deg);

    &:hover {
      transform: rotate(-70deg);
    }
  }
`

const ChildrenContainer = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  ${Container}.collapsed & {
    display: none;
  }
`

type SelectionStatus =
  | 'not-selectable'
  | 'not-selected'
  | 'selected'
  | 'descendant-is-selected'

const BaseItem: React.FC<{
  label: React.ReactNode
  select?: VoidFn
  depth: number
  selectionStatus: SelectionStatus
  labelDecoration?: React.ReactNode
  children?: React.ReactNode | undefined
  collapsed?: boolean
  setIsCollapsed?: (v: boolean) => void
  headerRef?: React.Ref<HTMLDivElement>
  /** Replaces the default leaf Package icon when the item has no children. */
  leafIcon?: React.ReactNode
}> = ({
  label,
  children,
  depth,
  select,
  selectionStatus,
  labelDecoration,
  collapsed = false,
  setIsCollapsed,
  headerRef,
  leafIcon,
}) => {
  const canContainChildren = children !== undefined

  return (
    <Container
      style={
        /* @ts-ignore */
        {'--depth': depth}
      }
      className={collapsed ? 'collapsed' : ''}
    >
      <Header
        ref={headerRef}
        className={selectionStatus}
        onClick={select ?? noop}
        data-header
      >
        <Head_IconContainer>
          {canContainChildren ? (
            <Head_Icon_WithDescendants
              onClick={(evt) => {
                evt.stopPropagation()
                evt.preventDefault()
                setIsCollapsed?.(!collapsed)
              }}
            >
              <ChevronDown />
            </Head_Icon_WithDescendants>
          ) : (
            (leafIcon ?? <Package />)
          )}
        </Head_IconContainer>

        <Head_Label>
          <span>{label}</span>
        </Head_Label>
        {labelDecoration}
      </Header>
      {canContainChildren && <ChildrenContainer>{children}</ChildrenContainer>}
    </Container>
  )
}

export default BaseItem
