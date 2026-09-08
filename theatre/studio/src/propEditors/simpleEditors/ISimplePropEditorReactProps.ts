import type {IBasePropType} from '@unseenco/theatre-core/propTypes'
import type {IEditingTools} from '@unseenco/theatre-studio/propEditors/utils/IEditingTools'
import type {MutableRefObject, MouseEvent} from 'react'

/** Helper for defining consistent prop editor components */
export type ISimplePropEditorReactProps<
  TPropTypeConfig extends IBasePropType<string, any>,
> = {
  propConfig: TPropTypeConfig
  editingTools: IEditingTools<TPropTypeConfig['valueType']>
  value: TPropTypeConfig['valueType']
  autoFocus?: boolean
  /** Details-pane Dialkit layout: label rendered inside the control. */
  label?: string
  /**
   * When the surrounding chip is clicked (label / empty chrome), the editor
   * registers a handler here so bool/color/text/image can respond to whole-chip hits.
   */
  hostClickRef?: MutableRefObject<((e: MouseEvent) => void) | null>
}
