import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import {
  DEFAULT_SEQUENCE_VARIANT,
  type SequenceVariantId,
} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@theatre/studio/utils/activeSequenceVariant'
import {isObjectOverriddenInVariant} from '@theatre/studio/utils/variantObjectOverrides'
import React from 'react'
import BaseItem from '@theatre/studio/panels/OutlinePanel/BaseItem'
import {usePrism} from '@theatre/react'
import {getOutlineSelection} from '@theatre/studio/selectors'
import useContextMenu from '@theatre/studio/uiComponents/simpleContextMenu/useContextMenu'
import type {IContextMenuItem} from '@theatre/studio/uiComponents/simpleContextMenu/useContextMenu'
import useRefAndState from '@theatre/studio/utils/useRefAndState'

export const ObjectItem: React.VFC<{
  sheetObject: SheetObject
  depth: number
  overrideLabel?: string
  variant: SequenceVariantId
}> = ({sheetObject, depth, overrideLabel, variant}) => {
  const [headerRef, headerNode] = useRefAndState<HTMLDivElement | null>(null)

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

  const contextMenuItems = usePrism((): IContextMenuItem[] => {
    const sheetAddress = sheetObject.sheet.address
    const objectKey = sheetObject.address.objectKey
    const variants = sheetObject.sheet.template.getSequenceVariants()

    if (variant === DEFAULT_SEQUENCE_VARIANT) {
      return variants
        .filter((v) => v !== DEFAULT_SEQUENCE_VARIANT)
        .filter(
          (v) =>
            !isObjectOverriddenInVariant(sheetAddress, v, objectKey),
        )
        .map((targetVariant) => ({
          label: `Override in variant: ${targetVariant}`,
          callback: () => {
            getStudio()!.transaction(({stateEditors}) => {
              stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.addVariantObjectOverride(
                {
                  ...sheetAddress,
                  variant: targetVariant,
                  objectKey,
                },
              )
              setStudioActiveSequenceVariant(
                sheetAddress,
                targetVariant,
                stateEditors,
              )
              stateEditors.studio.historic.panels.outline.selection.set([
                sheetObject,
              ])
            })
          },
        }))
    }

    return [
      {
        label: 'Remove override',
        callback: () => {
          getStudio()!.transaction(({stateEditors}) => {
            stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.removeVariantObjectOverride(
              {
                ...sheetAddress,
                variant,
                objectKey,
              },
            )
            setStudioActiveSequenceVariant(
              sheetAddress,
              DEFAULT_SEQUENCE_VARIANT,
              stateEditors,
            )
            stateEditors.studio.historic.panels.outline.selection.set([
              sheetObject,
            ])
          })
        },
      },
    ]
  }, [sheetObject, variant])

  const [contextMenu] = useContextMenu(headerNode, {
    menuItems: contextMenuItems,
    displayName: 'Outline object',
    disabled: contextMenuItems.length === 0,
  })

  return (
    <>
      {contextMenu}
      <BaseItem
        select={select}
        label={overrideLabel ?? sheetObject.address.objectKey}
        depth={depth}
        selectionStatus={selectionStatus}
        headerRef={headerRef}
      />
    </>
  )
}
