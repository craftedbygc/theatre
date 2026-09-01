import type {UnknownShorthandCompoundProps} from '@unseenco/theatre-core/propTypes/internals'
import type SheetObject from './SheetObject'

const weakMapOfUnsanitizedProps = new WeakMap<
  SheetObject,
  UnknownShorthandCompoundProps
>()

export function getUnsanitizedObjectProps(
  object: SheetObject,
): UnknownShorthandCompoundProps | undefined {
  return weakMapOfUnsanitizedProps.get(object)
}

export function setUnsanitizedObjectProps(
  object: SheetObject,
  config: UnknownShorthandCompoundProps,
): void {
  weakMapOfUnsanitizedProps.set(object, config)
}

export function mergeUnsanitizedObjectProps(
  object: SheetObject,
  additional: UnknownShorthandCompoundProps,
): UnknownShorthandCompoundProps {
  const existing = weakMapOfUnsanitizedProps.get(object) ?? {}
  const merged = {...existing, ...additional}
  weakMapOfUnsanitizedProps.set(object, merged)
  return merged
}
