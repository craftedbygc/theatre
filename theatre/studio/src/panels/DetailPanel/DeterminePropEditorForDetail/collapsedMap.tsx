import type {Atom, Pointer} from '@unseenco/theatre-dataverse'

export const collapsedMap = new WeakMap<Pointer<{}>, Atom<boolean>>()
