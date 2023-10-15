import type {Pointer} from '@unseenco/theatre-dataverse'
import React, {useLayoutEffect, useMemo, useRef} from 'react'
import styled from 'styled-components'
import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'
import {usePrism, useVal} from '@unseenco/theatre-react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {BasicNumberInputNudgeFn} from '@unseenco/theatre-studio/uiComponents/form/BasicNumberInput'
import BasicNumberInput from '@unseenco/theatre-studio/uiComponents/form/BasicNumberInput'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import {propNameTextCSS} from '@unseenco/theatre-studio/propEditors/utils/propNameTextCSS'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'

const greaterThanZero = (v: number) => isFinite(v) && v > 0

const Container = styled.div`
  display: flex;
  gap: 8px;
  height: 28px;
  align-items: center;
`

const Label = styled.div`
  ${propNameTextCSS};
  white-space: nowrap;
`

const nudge: BasicNumberInputNudgeFn = ({deltaX}) => deltaX * 0.25

const LengthEditorPopover: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  /**
   * Called when user hits enter/escape
   */
  onRequestClose: (reason: string) => void
}> = ({layoutP}) => {
  const sheet = useVal(layoutP.sheet)

  const fns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newLength: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          stateEditors.coreByProject.historic.sheetsById.sequence.setLength({
            ...sheet.address,
            length: newLength,
          })
        })
      },
      discardTemporaryValue(): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
      },
      permanentlySetValue(newLength: number): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          stateEditors.coreByProject.historic.sheetsById.sequence.setLength({
            ...sheet.address,
            length: newLength,
          })
        })
      },
    }
  }, [layoutP, sheet])

  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    inputRef.current!.focus()
  }, [])

  return usePrism(() => {
    const sequence = getStudioSequence(sheet)
    const sequenceLength = sequence.length

    return (
      <Container>
        <Label>Sequence length</Label>
        <BasicNumberInput
          value={sequenceLength}
          {...fns}
          isValid={greaterThanZero}
          inputRef={inputRef}
          nudge={nudge}
        />
      </Container>
    )
  }, [sheet, fns, inputRef])
}

export default LengthEditorPopover
