import type Project from '@unseenco/theatre-core/projects/Project'
import type Sheet from '@unseenco/theatre-core/sheets/Sheet'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {
  getOutlineSelection,
  getSheetOfSheetId,
} from '@unseenco/theatre-studio/selectors'
import {usePrism} from '@unseenco/theatre-react'
import {val} from '@unseenco/theatre-dataverse'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import BaseItem from '@unseenco/theatre-studio/panels/OutlinePanel/BaseItem'
import {VariantItem} from '@unseenco/theatre-studio/panels/OutlinePanel/SheetsList/VariantItem'
import {useCollapseStateInOutlinePanel} from '@unseenco/theatre-studio/panels/OutlinePanel/outlinePanelUtils'

const Body = styled.div``

export const SheetItem: React.FC<{
  depth: number
  sheetId: string
  project: Project
}> = ({sheetId, depth, project}) => {
  return usePrism(() => {
    const template = val(project.sheetTemplatesP[sheetId])
    if (!template) return <></>

    const sheet = getSheetOfSheetId(project, sheetId)
    if (!sheet) return <></>

    return <SheetItemContent depth={depth} sheet={sheet} />
  }, [depth, sheetId, project])
}

const SheetItemContent: React.FC<{
  depth: number
  sheet: Sheet
}> = ({sheet, depth}) => {
  const {collapsed, setCollapsed} = useCollapseStateInOutlinePanel(sheet)

  const setSelectedSheet = useCallback(() => {
    getStudio()!.transaction(({stateEditors}) => {
      stateEditors.studio.historic.panels.outline.selection.set([sheet])
    })
  }, [sheet])

  return usePrism(() => {
    const selection = getOutlineSelection()

    return (
      <BaseItem
        depth={depth}
        select={setSelectedSheet}
        setIsCollapsed={setCollapsed}
        collapsed={collapsed}
        selectionStatus={
          selection.some((s) => s === sheet)
            ? 'selected'
            : selection.some(
                (s) => s.type === 'Theatre_SheetObject' && s.sheet === sheet,
              )
            ? 'descendant-is-selected'
            : 'not-selected'
        }
        label={sheet.address.sheetId}
      >
        <Body>
          {sheet.template.getSequenceVariants().map((variant) => (
            <VariantItem
              key={`variant-${sheet.address.sheetId}-${variant}`}
              depth={depth + 1}
              sheet={sheet}
              variant={variant}
            />
          ))}
        </Body>
      </BaseItem>
    )
  }, [depth, collapsed, sheet, setSelectedSheet])
}
