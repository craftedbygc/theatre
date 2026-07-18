import {transparentize} from 'polished'
import React, {useMemo} from 'react'
import styled from 'styled-components'
import getStudio from '@theatre/studio/getStudio'
import type {PathToProp} from '@theatre/shared/utils/addresses'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type {PropTypeConfig} from '@theatre/core/propTypes'
import {nextPrevCursorsTheme} from './NextPrevKeyframeCursors'
import {
  isPropConfigComposite,
  iteratePropType,
} from '@theatre/shared/propTypes/utils'
import useContextMenu from '@theatre/studio/uiComponents/simpleContextMenu/useContextMenu'
import type {IContextMenuItem} from '@theatre/studio/uiComponents/simpleContextMenu/useContextMenu'
import useRefAndState from '@theatre/studio/utils/useRefAndState'
import {
  getStudioActiveSequenceVariant,
  setStudioActiveSequenceVariant,
} from '@theatre/studio/utils/activeSequenceVariant'
import {encodePathToProp} from '@theatre/shared/utils/addresses'
import {getSequenceStateFromSheet} from '@theatre/core/sequences/sequenceVariants'
import {val} from '@theatre/dataverse'

const theme = {
  defaultState: {
    color: transparentize(0.95, `#C4C4C4`),
    hoverColor: transparentize(0.15, nextPrevCursorsTheme.onColor),
  },
  withStaticOverride: {
    color: transparentize(0.2, `#339cb5`),
    hoverColor: transparentize(0.15, nextPrevCursorsTheme.onColor),
  },
}

const Container = styled.div<{
  hasStaticOverride: boolean
}>`
  width: 16px;
  margin: 0 0px 0 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  color: ${(props) =>
    props.hasStaticOverride
      ? theme.withStaticOverride.color
      : theme.defaultState.color};

  &:hover {
    color: ${(props) =>
      props.hasStaticOverride
        ? theme.withStaticOverride.hoverColor
        : theme.defaultState.hoverColor};
  }
`

const DefaultIcon = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  /* border: 1px solid currentColor; */
  background-color: currentColor;
`

const FilledIcon = styled.div`
  width: 5px;
  height: 5px;
  background-color: currentColor;
  border-radius: 1px;
  transform: rotate(45deg);
`

function sequencePropOnVariant(
  obj: SheetObject,
  propConfig: PropTypeConfig,
  pathToProp: PathToProp,
  variant: string,
) {
  getStudio()!.transaction(({stateEditors}) => {
    setStudioActiveSequenceVariant(
      {projectId: obj.address.projectId, sheetId: obj.address.sheetId},
      variant,
    )
    for (const {path, conf} of iteratePropType(propConfig, pathToProp)) {
      if (isPropConfigComposite(conf)) continue
      const propAddress = {...obj.address, pathToProp: path, sequenceVariant: variant}

      stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsSequenced(
        propAddress,
        propConfig,
      )
    }
  })
}

function isPropDirectlySequencedOnVariant(
  obj: SheetObject,
  pathToProp: PathToProp,
  variant: string,
): boolean {
  const sheetState = val(
    obj.template.project.pointers.historic.sheetsById[obj.address.sheetId],
  )
  const sequenceState = getSequenceStateFromSheet(sheetState, variant)
  const encodedPath = encodePathToProp(pathToProp)
  return (
    typeof sequenceState?.tracksByObject[obj.address.objectKey]
      ?.trackIdByPropPath[encodedPath] === 'string'
  )
}

const DefaultOrStaticValueIndicator: React.FC<{
  hasStaticOverride: boolean
  pathToProp: PathToProp
  obj: SheetObject
  propConfig: PropTypeConfig
}> = (props) => {
  const {hasStaticOverride, obj, propConfig, pathToProp} = props
  const [containerRef, containerNode] = useRefAndState<HTMLDivElement | null>(
    null,
  )
  const variants = obj.sheet.template.getSequenceVariants()
  const hasMultipleVariants = variants.length > 1

  const sequenceCb = (variant?: string) => {
    const targetVariant =
      variant ?? getStudioActiveSequenceVariant(obj.sheet.address)
    sequencePropOnVariant(obj, propConfig, pathToProp, targetVariant)
  }

  const contextMenuItems: IContextMenuItem[] = useMemo(() => {
    if (!hasMultipleVariants) return []

    return variants.map((variant) => {
      const isSequenced = isPropDirectlySequencedOnVariant(
        obj,
        pathToProp,
        variant,
      )
      const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)
      const isActive = variant === activeVariant

      return {
        label: isSequenced
          ? `Sequence (${variant}) ✓`
          : `Sequence (${variant})`,
        callback: () => {
          if (!isSequenced) {
            sequenceCb(variant)
          } else {
            setStudioActiveSequenceVariant(obj.sheet.address, variant)
          }
        },
        enabled: !isSequenced || isActive,
      }
    })
  }, [hasMultipleVariants, variants, obj, pathToProp])

  const [contextMenu] = useContextMenu(containerNode, {
    menuItems: contextMenuItems,
    displayName: 'Sequence variant',
    disabled: !hasMultipleVariants,
  })

  return (
    <>
      {contextMenu}
      <Container
        ref={containerRef}
        hasStaticOverride={hasStaticOverride}
        onClick={() => sequenceCb()}
        title={
          hasMultipleVariants
            ? 'Click to sequence. Right-click to choose a variant.'
            : 'Sequence this prop'
        }
      >
        {hasStaticOverride ? (
          <FilledIcon title="The default value is overridden" />
        ) : (
          <DefaultIcon title="This is the default value for this prop" />
        )}
      </Container>
    </>
  )
}

export default DefaultOrStaticValueIndicator
