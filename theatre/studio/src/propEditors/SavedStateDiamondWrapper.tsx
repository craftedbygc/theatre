import React from 'react'
import {
  SequencedDiamondSvg,
  StaticDiamondSvg,
  StaticDiamondWithOuterSvg,
} from './propIndicatorIcons'

export const DIVERGED_FROM_SAVED_STATE_TITLE =
  'This value has been modified from the saved version'

const SavedStateDiamondWrapper: React.FC<{
  hasDivergedFromSavedState: boolean
  layout?: 'static' | 'sequenced'
  variant?: 'filled' | 'outline'
  title?: string
}> = ({
  hasDivergedFromSavedState,
  layout = 'static',
  variant = 'filled',
  title,
}) => {
  const resolvedTitle = hasDivergedFromSavedState
    ? DIVERGED_FROM_SAVED_STATE_TITLE
    : title

  let diamond: React.ReactNode
  if (layout === 'sequenced') {
    diamond = <SequencedDiamondSvg showOuter={hasDivergedFromSavedState} />
  } else if (hasDivergedFromSavedState) {
    diamond = (
      <StaticDiamondWithOuterSvg variant={variant} title={resolvedTitle} />
    )
  } else {
    diamond = <StaticDiamondSvg variant={variant} title={resolvedTitle} />
  }

  if (!hasDivergedFromSavedState) {
    return <>{diamond}</>
  }

  return <span title={DIVERGED_FROM_SAVED_STATE_TITLE}>{diamond}</span>
}

export default SavedStateDiamondWrapper
