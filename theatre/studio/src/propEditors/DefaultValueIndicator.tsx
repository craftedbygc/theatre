import {transparentize} from 'polished'
import React from 'react'
import styled from 'styled-components'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {PathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {PropTypeConfig} from '@unseenco/theatre-core/propTypes'
import {nextPrevCursorsTheme} from './NextPrevKeyframeCursors'
import {
  isPropConfigComposite,
  iteratePropType,
} from '@unseenco/theatre-shared/propTypes/utils'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import SavedStateDiamondWrapper from './SavedStateDiamondWrapper'

const theme = {
  defaultState: {
    color: transparentize(0.8, `#C4C4C4`),
    hoverColor: transparentize(0.15, nextPrevCursorsTheme.onColor),
  },
  withStaticOverride: {
    color: transparentize(0.2, `#339cb5`),
    hoverColor: transparentize(0.15, nextPrevCursorsTheme.onColor),
  },
}

const Container = styled.div<{
  hasStaticOverride: boolean
  $isNonInteractive?: boolean
}>`
  width: 16px;
  margin: 0 0px 0 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: ${(props) => (props.$isNonInteractive ? 'default' : 'pointer')};

  color: ${(props) =>
    props.hasStaticOverride
      ? theme.withStaticOverride.color
      : theme.defaultState.color};

  ${(props) =>
    props.$isNonInteractive
      ? ''
      : `&:hover {
    color: ${
      props.hasStaticOverride
        ? theme.withStaticOverride.hoverColor
        : theme.defaultState.hoverColor
    };
  }`}
`

const DefaultIcon = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  background-color: currentColor;
`

const FilledIcon = styled.div`
  width: 5px;
  height: 5px;
  background-color: currentColor;
  border-radius: 1px;
  transform: rotate(45deg);
`

const OutlineIcon = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  border: 1px solid currentColor;
`

function sequenceProp(
  obj: SheetObject,
  propConfig: PropTypeConfig,
  pathToProp: PathToProp,
) {
  const activeVariant = getStudioActiveSequenceVariant(obj.sheet.address)

  getStudio()!.transaction(({stateEditors}) => {
    for (const {path, conf} of iteratePropType(propConfig, pathToProp)) {
      if (isPropConfigComposite(conf)) continue
      const propAddress = {
        ...obj.address,
        pathToProp: path,
        sequenceVariant: activeVariant,
      }

      stateEditors.coreByProject.historic.sheetsById.sequence.setPrimitivePropAsSequenced(
        propAddress,
        propConfig,
      )
    }
  })
}

const DefaultOrStaticValueIndicator: React.FC<{
  hasStaticOverride: boolean
  hasDivergedFromSavedState: boolean
  pathToProp: PathToProp
  obj: SheetObject
  propConfig: PropTypeConfig
  isStatic?: boolean
  isTransient?: boolean
}> = (props) => {
  const {
    hasStaticOverride,
    hasDivergedFromSavedState,
    obj,
    propConfig,
    pathToProp,
    isStatic,
    isTransient,
  } = props

  const usesOutlineStyle = isStatic || isTransient

  if (usesOutlineStyle) {
    const showBlueOverride = Boolean(
      isStatic && !isTransient && hasStaticOverride,
    )

    let title: string
    if (isTransient) {
      title = 'This is a transient prop'
    } else if (showBlueOverride) {
      title = 'Static prop — the default value is overridden'
    } else {
      title = 'This is a static prop'
    }

    return (
      <Container
        hasStaticOverride={showBlueOverride}
        $isNonInteractive
        title={title}
      >
        <SavedStateDiamondWrapper
          hasDivergedFromSavedState={hasDivergedFromSavedState}
        >
          <OutlineIcon />
        </SavedStateDiamondWrapper>
      </Container>
    )
  }

  return (
    <Container
      hasStaticOverride={hasStaticOverride}
      onClick={() => sequenceProp(obj, propConfig, pathToProp)}
      title="Sequence this prop"
    >
      <SavedStateDiamondWrapper
        hasDivergedFromSavedState={hasDivergedFromSavedState}
      >
        {hasStaticOverride ? (
          <FilledIcon title="The default value is overridden" />
        ) : (
          <DefaultIcon title="This is the default value for this prop" />
        )}
      </SavedStateDiamondWrapper>
    </Container>
  )
}

export default DefaultOrStaticValueIndicator
