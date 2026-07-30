import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
// eslint-disable-next-line no-restricted-syntax
import {DEFAULT_SEQUENCE_VARIANT} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import {isObjectOverriddenInVariant} from '@unseenco/theatre-studio/utils/variantObjectOverrides'
import React from 'react'
import BaseItem from '@unseenco/theatre-studio/panels/OutlinePanel/BaseItem'
import {usePrism} from '@unseenco/theatre-react'
import {getOutlineSelection} from '@unseenco/theatre-studio/selectors'
import useContextMenu from '@unseenco/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import type {IContextMenuItem} from '@unseenco/theatre-studio/uiComponents/simpleContextMenu/useContextMenu'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import useChordial from '@unseenco/theatre-studio/uiComponents/chordial/useChodrial'
import {mergeRefs} from 'react-merge-refs'

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
    const activeVariant = getStudioActiveSequenceVariant(
      sheetObject.sheet.address,
    )

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
        .filter((v) => !isObjectOverriddenInVariant(sheetAddress, v, objectKey))
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

  const {targetRef} = useChordial(() => {
    return {
      title: `Object: ${sheetObject.address.objectKey}`,
      items: [],
    }
  })

  return (
    <>
      {contextMenu}
      <BaseItem
        select={select}
        label={overrideLabel ?? sheetObject.address.objectKey}
        depth={depth}
        selectionStatus={selectionStatus}
        headerRef={mergeRefs([headerRef, targetRef])}
      />
    </>
  )
}
