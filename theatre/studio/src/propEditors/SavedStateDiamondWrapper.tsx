import React from 'react'
import styled from 'styled-components'

/** Matches the center of the original 8×12 sequenced-diamond SVG. */
export const SEQUENCED_DIAMOND_CENTER_Y_PERCENT = (7 / 12) * 100

const Wrapper = styled.div<{
  $showOuterDiamond: boolean
  $width?: number
  $height?: number
  $centerYPercent: number
}>`
  position: relative;
  flex-shrink: 0;

  ${(props) =>
    props.$width != null && props.$height != null
      ? `
    width: ${props.$width}px;
    height: ${props.$height}px;
  `
      : `
    display: flex;
    align-items: center;
    justify-content: center;
  `}

  ${(props) =>
    props.$showOuterDiamond
      ? `
    &::before {
      content: '';
      position: absolute;
      top: ${props.$centerYPercent}%;
      left: 50%;
      width: 9px;
      height: 9px;
      border-radius: 1px;
      transform: translate(-50%, -50%) rotate(45deg);
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-sizing: border-box;
      pointer-events: none;
    }
  `
      : ''}
`

const InnerAnchor = styled.div<{$centerYPercent: number}>`
  position: absolute;
  left: 50%;
  top: ${(props) => props.$centerYPercent}%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
`

const SavedStateDiamondWrapper: React.FC<{
  hasDivergedFromSavedState: boolean
  layout?: 'static' | 'sequenced'
  children: React.ReactNode
}> = ({hasDivergedFromSavedState, layout = 'static', children}) => {
  const isSequenced = layout === 'sequenced'
  const centerYPercent = isSequenced
    ? SEQUENCED_DIAMOND_CENTER_Y_PERCENT
    : 50

  return (
    <Wrapper
      $showOuterDiamond={hasDivergedFromSavedState}
      $width={isSequenced ? 8 : undefined}
      $height={isSequenced ? 12 : undefined}
      $centerYPercent={centerYPercent}
    >
      {isSequenced ? (
        <InnerAnchor $centerYPercent={centerYPercent}>
          {children}
        </InnerAnchor>
      ) : (
        children
      )}
    </Wrapper>
  )
}

export default SavedStateDiamondWrapper
