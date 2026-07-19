import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@theatre/studio/utils/activeSequenceVariant'
import React from 'react'
import BaseItem from '@theatre/studio/panels/OutlinePanel/BaseItem'
import {usePrism} from '@theatre/react'
import {getOutlineSelection} from '@theatre/studio/selectors'

export const ObjectItem: React.VFC<{
  sheetObject: SheetObject
  depth: number
  overrideLabel?: string
  variant: SequenceVariantId
}> = ({sheetObject, depth, overrideLabel, variant}) => {
  const select = () => {
    getStudio()!.transaction(({stateEditors}) => {
      setStudioActiveSequenceVariant(
        sheetObject.sheet.address,
        variant,
        stateEditors,
      )
      stateEditors.studio.historic.panels.outline.selection.set([sheetObject])
    })
  }

  const selectionStatus = usePrism(() => {
    const outlineSelection = getOutlineSelection()
    const activeVariant = getStudioActiveSequenceVariant(sheetObject.sheet.address)

    return outlineSelection.includes(sheetObject) && activeVariant === variant
      ? 'selected'
      : 'not-selected'
  }, [sheetObject, variant])

  return (
    <BaseItem
      select={select}
      label={overrideLabel ?? sheetObject.address.objectKey}
      depth={depth}
      selectionStatus={selectionStatus}
    />
  )
}
