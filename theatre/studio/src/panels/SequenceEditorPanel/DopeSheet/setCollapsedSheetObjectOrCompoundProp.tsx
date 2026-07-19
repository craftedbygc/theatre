import type {StudioSheetItemKey} from '@unseenco/theatre-shared/utils/ids'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {
  SheetAddress,
  WithoutSheetInstance,
} from '@unseenco/theatre-shared/utils/addresses'

export function setCollapsedSheetItem(
  isCollapsed: boolean,
  toCollapse: {
    sheetAddress: WithoutSheetInstance<SheetAddress>
    sheetItemKey: StudioSheetItemKey
  },
) {
  getStudio().transaction(({stateEditors}) => {
    stateEditors.studio.ahistoric.projects.stateByProjectId.stateBySheetId.sequence.sequenceEditorCollapsableItems.set(
      {
        ...toCollapse.sheetAddress,
        studioSheetItemKey: toCollapse.sheetItemKey,
        isCollapsed,
      },
    )
  })
}
