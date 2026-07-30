import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {Atom} from '@unseenco/theatre-dataverse'

type TakeFn<EventType> = (e: EventType) => void
type TransitionFn<EventType, ContextType> = (
  stateName: string,
  context: ContextType,
  take: TakeFn<EventType>,
) => void

type Actor<ContextType, EventType> = {
  pointer: Pointer<ContextType>
  send: (s: EventType) => void
}

/**
 * This is a basic FSM implementation.
 */
export function basicFSM<EventType, ContextType>(
  setup: (transition: TransitionFn<EventType, ContextType>) => void,
): () => Actor<ContextType, EventType> {
  return () => {
    const atom = new Atom<{
      stateName: string
      context: ContextType
      take: TakeFn<EventType>
    }>({} as $IntentionalAny)

    function transition(
      stateName: string,
      context: ContextType,
      take: TakeFn<EventType>,
    ) {
      atom.set({stateName, context, take})
    }

    setup(transition)

    function send(event: EventType) {
      let state = atom.get()
      state.take(event)
    }
    return {
      pointer: atom.pointer.context,
      send,
    }
  }
}
