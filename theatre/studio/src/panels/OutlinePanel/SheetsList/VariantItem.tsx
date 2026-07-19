import type Sheet from '@unseenco/theatre-core/sheets/Sheet'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import {usePrism} from '@unseenco/theatre-react'
import React, {useCallback} from 'react'
import styled from 'styled-components'
import BaseItem from '@unseenco/theatre-studio/panels/OutlinePanel/BaseItem'
import {useCollapseStateInOutlinePanel} from '@unseenco/theatre-studio/panels/OutlinePanel/outlinePanelUtils'
import ObjectsList from '@unseenco/theatre-studio/panels/OutlinePanel/ObjectsList/ObjectsList'

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
            key={`objects-${sheet.address.sheetId}-${variant}`}
          />
        </Body>
      </BaseItem>
    )
  }, [depth, collapsed, sheet, variant, selectVariant])
}
