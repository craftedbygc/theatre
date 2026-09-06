import type {IBasePropType} from '@unseenco/theatre-core/propTypes'
import type {IEditingTools} from '@unseenco/theatre-studio/propEditors/utils/IEditingTools'

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
}
