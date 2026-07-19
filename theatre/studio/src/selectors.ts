import type Project from '@theatre/core/projects/Project'
import type Sequence from '@theatre/core/sequences/Sequence'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type Sheet from '@theatre/core/sheets/Sheet'
import {val} from '@theatre/dataverse'
import {isSheet, isSheetObject} from '@theatre/shared/instanceTypes'
import type {SheetInstanceId} from '@theatre/shared/utils/ids'
import {uniq} from 'lodash-es'
import getStudio from './getStudio'
import type {OutlineSelectable, OutlineSelection} from './store/types'
import {getStudioSequence} from '@theatre/studio/utils/activeSequenceVariant'

export const getOutlineSelection = (): OutlineSelection => {
  const projects = val(getStudio().projectsP)

  const mapped: (OutlineSelectable | undefined)[] = (
    val(getStudio().atomP.historic.panels.outlinePanel.selection) ?? []
  ).map((s) => {
    const project = projects[s.projectId]
    if (!project) return
    if (s.type === 'Project') return project
    const sheetTemplate = val(project.sheetTemplatesP[s.sheetId])
    if (!sheetTemplate) {
      return
    }
    const sheet = getSheetOfSheetId(project, s.sheetId)
    if (!sheet) return
    if (s.type === 'Sheet' || s.type === 'SheetVariant') {
      return sheet
    }
    if (s.type === 'SheetObject') {
      const obj = val(sheet.objectsP[s.objectKey])
      if (!obj) return
      return obj
    }
    return
  })

  return uniq(
    mapped.filter((s): s is OutlineSelectable => typeof s !== 'undefined'),
  )
}

export const getSheetOfSheetId = (
  project: Project,
  sheetId: string,
): Sheet | undefined => {
  const template = val(project.sheetTemplatesP[sheetId])
  if (!template) return undefined

  return template.getInstance('default' as SheetInstanceId)
}

/**
 * component instances could come and go all the time. This hook
 * makes sure we don't cause re-renders
 */
export function getRegisteredSheetIds(project: Project): string[] {
  return Object.keys(val(project.sheetTemplatesP))
}

export function getSelectedSequence(): undefined | Sequence {
  const selectedSheets = uniq(
    getOutlineSelection()
      .filter((s): s is SheetObject | Sheet => isSheet(s) || isSheetObject(s))
      .map((s) => (isSheetObject(s) ? s.sheet : s)),
  )
  const sheet = selectedSheets[0]
  if (!sheet) return

  return getStudioSequence(sheet)
}
