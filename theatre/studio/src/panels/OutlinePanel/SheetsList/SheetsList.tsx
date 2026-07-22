import {
  getRegisteredSheetIds,
  getSheetOfSheetId,
} from '@unseenco/theatre-studio/selectors'
import {usePrism} from '@unseenco/theatre-react'
import React from 'react'
import {SheetItem} from './SheetItem'
import type Project from '@unseenco/theatre-core/projects/Project'
import {isSheetVisibleInOutline} from '@unseenco/theatre-studio/panels/OutlinePanel/outlinePanelUtils'

const SheetsList: React.FC<{
  project: Project
  depth: number
}> = ({project, depth}) => {
  return usePrism(() => {
    if (!project) return null

    const registeredSheetIds = getRegisteredSheetIds(project)

    return (
      <>
        {registeredSheetIds
          .filter((sheetId) => {
            const sheet = getSheetOfSheetId(project, sheetId)
            return sheet ? isSheetVisibleInOutline(sheet) : false
          })
          .map((sheetId) => {
            return (
              <SheetItem
                depth={depth}
                sheetId={sheetId}
                key={`sheet-${sheetId}`}
                project={project}
              ></SheetItem>
            )
          })}
      </>
    )
  }, [project, depth])
}

export default SheetsList
