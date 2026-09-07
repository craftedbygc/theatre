import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {useEffect} from 'react'

export default function useOnClickOutside(
  container: Element | null | (Element | null)[],
  onOutside: (e: MouseEvent) => void,
  enabled?: boolean,
  // Can be used e.g. to prevent unexpected closing-reopening when clicking on a
  // popover's trigger.
) {
  useEffect(() => {
    if (!container || enabled === false) return

    const containers = Array.isArray(container)
      ? (container.filter((container) => container) as Element[])
      : [container]

    const onMouseDown = (e: MouseEvent) => {
      if (
        containers.every((container) => !e.composedPath().includes(container))
      ) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOnClickOutside.ts:onMouseDown',message:'click outside detected',data:{clientX:e.clientX,clientY:e.clientY,targetTag:e.target instanceof Element?e.target.tagName:null},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{})
        // #endregion
        onOutside(e)
      }
    }

    window.addEventListener('mousedown', onMouseDown, {
      capture: true,
      passive: false,
    })
    return () => {
      window.removeEventListener('mousedown', onMouseDown, {
        capture: true,
        passive: false,
      } as unknown as $IntentionalAny)
    }
  }, [container, enabled])
}
