import type Project from '@unseenco/theatre-core/projects/Project'
import type Sequence from '@unseenco/theatre-core/sequences/Sequence'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type Sheet from '@unseenco/theatre-core/sheets/Sheet'
import {val} from '@unseenco/theatre-dataverse'
import {
  isProject,
  isSheet,
  isSheetObject,
} from '@unseenco/theatre-shared/instanceTypes'
import type {SheetInstanceId} from '@unseenco/theatre-shared/utils/ids'
import {uniq} from 'lodash-es'
import getStudio from './getStudio'
import type {OutlineSelectable, OutlineSelection} from './store/types'
import {getStudioSequence} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import {
  STUDIO_PROJECT_ID,
  isSheetVisibleInOutline,
} from '@unseenco/theatre-studio/panels/OutlinePanel/outlinePanelUtils'
import type {ProjectId} from '@unseenco/theatre-shared/utils/ids'

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

function getFirstSheetInProject(project: Project): Sheet | undefined {
  for (const sheetId of getRegisteredSheetIds(project)) {
    const sheet = getSheetOfSheetId(project, sheetId)
    if (sheet && isSheetVisibleInOutline(sheet)) return sheet
  }
  return undefined
}

function getDefaultProjectForSequenceEditor(): Project | undefined {
  const projects = val(getStudio().projectsP)
  const projectIds = Object.keys(projects) as ProjectId[]

  for (const projectId of projectIds) {
    if (projectId === STUDIO_PROJECT_ID) continue
    const project = projects[projectId]
    if (project) return project
  }

  for (const projectId of projectIds) {
    const project = projects[projectId]
    if (project) return project
  }

  return undefined
}

/**
 * Resolves which sheet the sequence editor should display.
 *
 * When `fallbackToProjectSheet` is true and the outline selection does not
 * resolve to a single sheet, the first registered sheet in the selected
 * project is used. If nothing is selected, the first sheet in the first
 * user project is used.
 */
export function resolveSequenceEditorSheet(options?: {
  fallbackToProjectSheet?: boolean
}): Sheet | undefined {
  const selection = getOutlineSelection()

  const selectedSheets = uniq(
    selection
      .filter((s): s is SheetObject | Sheet => isSheet(s) || isSheetObject(s))
      .map((s) => (isSheetObject(s) ? s.sheet : s)),
  )
  const selectedTemplates = uniq(selectedSheets.map((s) => s.template))

  if (selectedTemplates.length === 1) {
    return selectedSheets[0]
  }

  if (!options?.fallbackToProjectSheet) {
    return undefined
  }

  const project =
    selection.find(isProject) ??
    selectedSheets[0]?.project ??
    getDefaultProjectForSequenceEditor()

  if (!project) return undefined

  return getFirstSheetInProject(project)
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
