import type Sequence from '@theatre/core/sequences/Sequence'
import {
  DEFAULT_SEQUENCE_VARIANT,
  type SequenceVariantId,
} from '@theatre/core/sequences/sequenceVariants'
import type Sheet from '@theatre/core/sheets/Sheet'
import type Project from '@theatre/core/projects/Project'
import type {Studio} from '@theatre/studio/Studio'
import getStudio from '@theatre/studio/getStudio'
import type {IStateEditors} from '@theatre/studio/store/stateEditors'
import type {WithoutSheetInstance, SheetAddress} from '@theatre/shared/utils/addresses'
import type {SheetId} from '@theatre/shared/utils/ids'
import {val} from '@theatre/dataverse'

/**
 * Returns the sequence for the variant currently being edited in Studio.
 * Unlike `sheet.getSequence()` (which defaults to the runtime active variant),
 * this always uses the studio's active sequence variant.
 */
export function getStudioSequence(sheet: Sheet): Sequence {
  return sheet.getSequence(getStudioActiveSequenceVariant(sheet.address))
}

export function getStudioActiveSequenceVariant(
  p: WithoutSheetInstance<SheetAddress>,
): SequenceVariantId {
  const studio = getStudio()
  if (!studio) return DEFAULT_SEQUENCE_VARIANT

  const variant = val(
    studio.atomP.historic.projects.stateByProjectId[p.projectId]
      .stateBySheetId[p.sheetId].activeSequenceVariant,
  )

  return variant ?? DEFAULT_SEQUENCE_VARIANT
}

function applyStudioPreviewVariantToSheetInstances(
  project: Project,
  p: WithoutSheetInstance<SheetAddress>,
  variant: SequenceVariantId,
): void {
  const template = val(project.sheetTemplatesP[p.sheetId])
  if (!template) return

  const instances = val(template.instancesP)
  for (const instance of Object.values(instances)) {
    instance?.setStudioPreviewVariantOverride(variant)
  }
}

/**
 * Syncs studio's persisted active variants to sheet preview overrides.
 * Call when studio attaches to projects so runtime `setActiveSequenceVariant()`
 * cannot override the studio editing variant.
 */
export function syncAllStudioPreviewVariants(studio: Studio): void {
  const projects = val(studio.projectsP)

  for (const project of Object.values(projects)) {
    if (!project) continue

    const projectState = val(
      studio.atomP.historic.projects.stateByProjectId[project.address.projectId],
    )
    if (!projectState) continue

    for (const sheetId of Object.keys(projectState.stateBySheetId) as SheetId[]) {
      const sheetState = projectState.stateBySheetId[sheetId]
      const variant = sheetState?.activeSequenceVariant ?? DEFAULT_SEQUENCE_VARIANT
      applyStudioPreviewVariantToSheetInstances(
        project,
        {projectId: project.address.projectId, sheetId},
        variant,
      )
    }
  }
}

export function setStudioActiveSequenceVariant(
  p: WithoutSheetInstance<SheetAddress>,
  variant: SequenceVariantId,
  stateEditors?: IStateEditors,
): void {
  const apply = (editors: IStateEditors) => {
    editors.studio.historic.projects.stateByProjectId.stateBySheetId.setActiveSequenceVariant(
      {...p, variant},
    )
  }

  if (stateEditors) {
    apply(stateEditors)
  } else {
    getStudio()!.transaction(({stateEditors: editors}) => apply(editors))
  }

  const studio = getStudio()
  if (!studio) return

  const project = val(studio.projectsP)[p.projectId]
  if (!project) return

  applyStudioPreviewVariantToSheetInstances(project, p, variant)
}

/**
 * Returns a pointer to the active sequence variant's historic state for a sheet.
 * Use inside reactive contexts (prisms) where the active variant may change.
 */
export function pointerToActiveSheetSequence(
  project: Project,
  sheetId: SheetId,
  p: WithoutSheetInstance<SheetAddress>,
) {
  const variant = getStudioActiveSequenceVariant(p)
  return project.pointers.historic.sheetsById[sheetId].sequencesById[variant]
}
