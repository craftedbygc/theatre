import type {PropTypeConfig_Number} from '@unseenco/theatre-core/propTypes'
import {getNumberPrecisionFromPropConfig} from '@unseenco/theatre-shared/propTypes/numberPrecision'
import BasicNumberInput from '@unseenco/theatre-studio/uiComponents/form/BasicNumberInput'
import React, {useCallback, useMemo} from 'react'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

function NumberPropEditor({
  propConfig,
  editingTools,
  value,
  autoFocus,
}: ISimplePropEditorReactProps<PropTypeConfig_Number>) {
  const precision = useMemo(
    () => getNumberPrecisionFromPropConfig(propConfig),
    [propConfig],
  )

  const nudge = useCallback(
    (params: {deltaX: number; deltaFraction: number; magnitude: number}) => {
      return propConfig.nudgeFn({...params, config: propConfig})
    },
    [propConfig],
  )

  return (
    <BasicNumberInput
      value={value}
      temporarilySetValue={editingTools.temporarilySetValue}
      discardTemporaryValue={editingTools.discardTemporaryValue}
      permanentlySetValue={editingTools.permanentlySetValue}
      range={propConfig.range}
      nudge={nudge}
      precision={precision}
      autoFocus={autoFocus}
    />
  )
}

export default NumberPropEditor
