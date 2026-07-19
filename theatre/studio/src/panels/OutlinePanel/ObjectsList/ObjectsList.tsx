import type Sheet from '@theatre/core/sheets/Sheet'
import {usePrism} from '@theatre/react'
import {val} from '@theatre/dataverse'
import React from 'react'
import styled from 'styled-components'
import {ObjectItem} from './ObjectItem'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import BaseItem from '@theatre/studio/panels/OutlinePanel/BaseItem'
import {
  ensureNamespacePath,
  type NamespacedObjects,
  parseOutlineNamespacePath,
  useCollapseStateInOutlinePanel,
} from '@theatre/studio/panels/OutlinePanel/outlinePanelUtils'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {isObjectOverriddenInVariant} from '@theatre/studio/utils/variantObjectOverrides'

export const Li = styled.li<{isSelected: boolean}>`
  color: ${(props) => (props.isSelected ? 'white' : 'hsl(1, 1%, 80%)')};
`

const ObjectsList: React.FC<{
  depth: number
  sheet: Sheet
  variant: SequenceVariantId
}> = ({sheet, depth, variant}) => {
  return usePrism(() => {
    const objectsMap = val(sheet.objectsP)
    const objects = Object.values(objectsMap)
      .filter((a): a is SheetObject => a != null)
      .filter((object) =>
        isObjectOverriddenInVariant(
          sheet.address,
          variant,
          object.address.objectKey,
        ),
      )

    const rootObject: NamespacedObjects = new Map()
    objects.forEach((object) => {
      addToNamespace(rootObject, object)
    })

    const outlineNamespaces = val(
      getStudio().atomP.ahistoric.coreByProject[sheet.address.projectId]
        .sheetsById[sheet.address.sheetId].outlineNamespaces,
    )

    if (outlineNamespaces) {
      Object.keys(outlineNamespaces).forEach((namespacePathKey) => {
        ensureNamespacePath(
          rootObject,
          parseOutlineNamespacePath(
            namespacePathKey,
            'sheet.declareOutlineNamespace',
          ),
        )
      })
    }

    return (
      <NamespaceTree
        namespace={rootObject}
        visualIndentation={depth}
        path={[]}
        sheet={sheet}
        variant={variant}
      />
    )
  }, [sheet, depth, variant])
}

function NamespaceTree(props: {
  namespace: NamespacedObjects
  visualIndentation: number
  path: string[]
  sheet: Sheet
  variant: SequenceVariantId
}) {
  return (
    <>
      {[...props.namespace.entries()].map(([label, {object, nested}]) => {
        return (
          <Namespace
            key={label}
            label={label}
            object={object}
            nested={nested}
            visualIndentation={props.visualIndentation}
            path={props.path}
            sheet={props.sheet}
            variant={props.variant}
          />
        )
      })}
    </>
  )
}

function Namespace(props: {
  nested?: NamespacedObjects
  label: string
  object?: SheetObject
  visualIndentation: number
  path: string[]
  sheet: Sheet
  variant: SequenceVariantId
}) {
  const {nested, label, object, sheet} = props
  const {collapsed, setCollapsed} = useCollapseStateInOutlinePanel({
    type: 'namespace',
    sheet,
    path: [...props.path, label],
  })

  const nestedChildrenElt = nested && (
    <NamespaceTree
      namespace={nested}
      path={[...props.path, label]}
      // Question: will there be key conflict if two components have the same labels?
      key={'namespaceTree(' + label + ')'}
      visualIndentation={props.visualIndentation + 1}
      sheet={sheet}
      variant={props.variant}
    />
  )
  const sameNameElt = object && (
    <ObjectItem
      depth={props.visualIndentation}
      key={'objectPath(' + object.address.objectKey + ')'}
      sheetObject={object}
      overrideLabel={label}
      variant={props.variant}
    />
  )

  return (
    <React.Fragment key={`${label} - ${props.visualIndentation}`}>
      {sameNameElt}
      {nestedChildrenElt && (
        <BaseItem
          selectionStatus="not-selectable"
          label={label}
          // key necessary for no duplicate keys (next to other React.Fragments)
          key={`baseItem(${label})`}
          depth={props.visualIndentation}
          children={nestedChildrenElt}
          collapsed={collapsed}
          setIsCollapsed={setCollapsed}
        />
      )}
    </React.Fragment>
  )
}

export default ObjectsList

function addToNamespace(
  mutObjects: NamespacedObjects,
  object: SheetObject,
  path = getObjectNamespacePath(object),
) {
  const [next, ...rest] = path
  let existing = mutObjects.get(next)
  if (!existing) {
    existing = {
      nested: undefined,
      object: undefined,
      path: [...path],
    }
    mutObjects.set(next, existing)
  }

  if (rest.length === 0) {
    console.assert(
      !existing.object,
      'expect not to have existing object with same name',
      {existing, object},
    )
    existing.object = object
  } else {
    if (!existing.nested) {
      existing.nested = new Map()
    }

    addToNamespace(existing.nested, object, rest)
  }
}

function getObjectNamespacePath(object: SheetObject): string[] {
  let existing = OBJECT_SPLITS_MEMO.get(object)
  if (!existing) {
    existing = object.address.objectKey.split(
      RE_SPLIT_BY_SLASH_WITHOUT_WHITESPACE,
    )
    console.assert(existing.length > 0, 'expected not empty')
    OBJECT_SPLITS_MEMO.set(object, existing)
  }
  return existing
}
/**
 * Relying on the fact we try to "sanitize paths" earlier.
 * Go look for `sanifySlashedPath` in a `utils/slashedPaths.ts`.
 */
const RE_SPLIT_BY_SLASH_WITHOUT_WHITESPACE = /\s*\/\s*/g
const OBJECT_SPLITS_MEMO = new WeakMap<SheetObject, string[]>()
