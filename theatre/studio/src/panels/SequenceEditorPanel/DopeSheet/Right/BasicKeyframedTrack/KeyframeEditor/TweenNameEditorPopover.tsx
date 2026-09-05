import React, {useLayoutEffect, useMemo, useRef} from 'react'
import styled from 'styled-components'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import {propNameTextCSS} from '@unseenco/theatre-studio/propEditors/utils/propNameTextCSS'
import BasicStringInput from '@unseenco/theatre-studio/uiComponents/form/BasicStringInput'
import type {Keyframe} from '@unseenco/theatre-core/projects/store/types/SheetState_Historic'
import type {SequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'

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

export type TweenNameEditorTarget = {
  sheetObject: SheetObject
  trackId: SequenceTrackId
  keyframe: Keyframe
}

export function getSharedTweenLabel(
  targets: Array<{keyframe: Keyframe}>,
): string | undefined {
  if (targets.length === 0) return undefined

  const firstLabel = targets[0].keyframe.tweenLabel
  if (!firstLabel) return undefined

  const allMatch = targets.every(
    (target) => target.keyframe.tweenLabel === firstLabel,
  )

  return allMatch ? firstLabel : undefined
}

const TweenNameEditorPopover: React.FC<{
  targets: TweenNameEditorTarget[]
  onRequestClose: (reason: string) => void
}> = ({targets, onRequestClose}) => {
  const initialLabel = getSharedTweenLabel(targets) ?? ''

  const fns = useMemo(() => {
    let tempTransaction: CommitOrDiscard | undefined

    return {
      temporarilySetValue(newLabel: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
          for (const target of targets) {
            stateEditors.coreByProject.historic.sheetsById.sequence.setTweenLabel(
              {
                ...target.sheetObject.address,
                trackId: target.trackId,
                keyframeId: target.keyframe.id,
                tweenLabel: newLabel,
              },
            )
          }
        })
      },
      discardTemporaryValue(): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
      },
      permanentlySetValue(newLabel: string): void {
        if (tempTransaction) {
          tempTransaction.discard()
          tempTransaction = undefined
        }
        getStudio()!.transaction(({stateEditors}) => {
          for (const target of targets) {
            stateEditors.coreByProject.historic.sheetsById.sequence.setTweenLabel(
              {
                ...target.sheetObject.address,
                trackId: target.trackId,
                keyframeId: target.keyframe.id,
                tweenLabel: newLabel,
              },
            )
          }
        })
      },
    }
  }, [targets])

  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    inputRef.current!.focus()
  }, [])

  return (
    <Container>
      <Label>Tween</Label>
      <BasicStringInput
        value={initialLabel}
        {...fns}
        isValid={() => true}
        inputRef={inputRef}
        onBlur={() => onRequestClose('blur')}
      />
    </Container>
  )
}

export default TweenNameEditorPopover
