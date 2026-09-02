import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div<{$showOuterDiamond: boolean}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  ${(props) =>
    props.$showOuterDiamond
      ? `
    &::before {
      content: '';
      position: absolute;
      top: 50%;
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

const SavedStateDiamondWrapper: React.FC<{
  hasDivergedFromSavedState: boolean
  children: React.ReactNode
}> = ({hasDivergedFromSavedState, children}) => {
  return (
    <Wrapper $showOuterDiamond={hasDivergedFromSavedState}>
      {children}
    </Wrapper>
  )
}

export default SavedStateDiamondWrapper
