import type {PropHighlighted} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/whatPropIsHighlighted'
import {css} from 'styled-components'

export const propNameTextCSS = css<{isHighlighted?: PropHighlighted}>`
  font-weight: 500;
  font-size: 12px;
  color: ${(props) => (props.isHighlighted === 'self' ? '#CCC' : '#919191')};
`
