import type Sheet from '@theatre/core/sheets/Sheet'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@theatre/studio/utils/activeSequenceVariant'
import {usePrism} from '@theatre/react'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import BaseItem from '@theatre/studio/panels/OutlinePanel/BaseItem'
import {useCollapseStateInOutlinePanel} from '@theatre/studio/panels/OutlinePanel/outlinePanelUtils'
import ObjectsList from '@theatre/studio/panels/OutlinePanel/ObjectsList/ObjectsList'

const Body = styled.div``

export const VariantItem: React.FC<{
  depth: number
  sheet: Sheet
  variant: SequenceVariantId
}> = ({sheet, depth, variant}) => {
  const {collapsed, setCollapsed} = useCollapseStateInOutlinePanel({
    type: 'variant',
    sheet,
    variant,
  })

  const selectVariant = useCallback(() => {
    getStudio()!.transaction(({stateEditors}) => {
      setStudioActiveSequenceVariant(sheet.address, variant, stateEditors)
      stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.setSelectedInstanceId(
        sheet.address,
      )
      stateEditors.studio.historic.panels.outline.selection.set([sheet])
    })
  }, [sheet, variant])

  return usePrism(() => {
    const activeVariant = getStudioActiveSequenceVariant(sheet.address)

    return (
      <BaseItem
        depth={depth}
        select={selectVariant}
        setIsCollapsed={setCollapsed}
        collapsed={collapsed}
        selectionStatus={
          activeVariant === variant ? 'selected' : 'not-selected'
        }
        label={`Variant: ${variant}`}
      >
        <Body>
          <ObjectsList
            depth={depth + 1}
            sheet={sheet}
            variant={variant}
            key={`objects-${sheet.address.sheetInstanceId}-${variant}`}
          />
        </Body>
      </BaseItem>
    )
  }, [depth, collapsed, sheet, variant, selectVariant])
}
