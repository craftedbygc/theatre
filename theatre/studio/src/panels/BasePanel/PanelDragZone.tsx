import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import type {
  $IntentionalAny,
  VoidFn,
} from '@unseenco/theatre-shared/utils/types'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {CommitOrDiscard} from '@unseenco/theatre-studio/StudioStore/StudioStore'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import React, {useMemo, useRef} from 'react'
import styled from 'styled-components'
import {panelDimsToPanelPosition, usePanel} from './BasePanel'
import {useCssCursorLock} from '@unseenco/theatre-studio/uiComponents/PointerEventsHandler'
import {clamp} from 'lodash-es'
import {minVisibleSize} from './common'

const Container = styled.div`
  cursor: move;
`

function isInteractiveTarget(event: MouseEvent): boolean {
  return event.composedPath().some((node) => {
    if (!(node instanceof HTMLElement)) return false
    if (node.isContentEditable) return true
    if (
      node instanceof HTMLInputElement ||
      node instanceof HTMLButtonElement ||
      node instanceof HTMLSelectElement ||
      node instanceof HTMLTextAreaElement ||
      node instanceof HTMLAnchorElement
    ) {
      return true
    }
    return node.getAttribute('role') === 'button'
  })
}

const PanelDragZone: React.FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
> = (props) => {
  const panelStuff = usePanel()
  const panelStuffRef = useRef(panelStuff)
  panelStuffRef.current = panelStuff

  const [ref, node] = useRefAndState<HTMLDivElement>(null as $IntentionalAny)

  const dragOpts: Parameters<typeof useDrag>[1] = useMemo(() => {
    return {
      debugName: 'PanelDragZone',
      lockCursorTo: 'move',
      onDragStart(event) {
        if (isInteractiveTarget(event)) {
          return false
        }
        const stuffBeforeDrag = panelStuffRef.current
        let tempTransaction: CommitOrDiscard | undefined

        const unlock = panelStuff.addBoundsHighlightLock()

        return {
          onDrag(dx, dy) {
            const newDims: typeof panelStuff['dims'] = {
              ...stuffBeforeDrag.dims,
              top: clamp(
                stuffBeforeDrag.dims.top + dy,
                0,
                window.innerHeight - minVisibleSize,
              ),
              left: clamp(
                stuffBeforeDrag.dims.left + dx,
                -stuffBeforeDrag.dims.width + minVisibleSize,
                window.innerWidth - minVisibleSize,
              ),
            }
            const position = panelDimsToPanelPosition(newDims, {
              width: window.innerWidth,
              height: window.innerHeight,
            })

            tempTransaction?.discard()
            tempTransaction = getStudio()!.tempTransaction(({stateEditors}) => {
              stateEditors.studio.historic.panelPositions.setPanelPosition({
                position,
                panelId: stuffBeforeDrag.panelId,
              })
            })
          },
          onDragEnd(dragHappened) {
            unlock()
            if (dragHappened) {
              tempTransaction?.commit()
            } else {
              tempTransaction?.discard()
            }
          },
        }
      },
    }
  }, [])

  const [isDragging] = useDrag(node, dragOpts)
  useCssCursorLock(isDragging, 'dragging', 'move')

  const [onMouseEnter, onMouseLeave] = useMemo(() => {
    let unlock: VoidFn | undefined
    return [
      function onMouseEnter() {
        if (unlock) {
          const u = unlock
          unlock = undefined
          u()
        }
        unlock = panelStuff.addBoundsHighlightLock()
      },
      function onMouseLeave() {
        if (unlock) {
          const u = unlock
          unlock = undefined
          u()
        }
      },
    ]
  }, [])

  return (
    <Container
      {...props}
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
}

export default PanelDragZone
