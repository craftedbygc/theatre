import type {WithoutSheetInstance, SheetAddress} from '@theatre/shared/utils/addresses'
import {
  DEFAULT_SEQUENCE_VARIANT,
  type SequenceVariantId,
} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {val} from '@theatre/dataverse'
import type Project from '@theatre/core/projects/Project'
import type {SheetId} from '@theatre/shared/utils/ids'

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

export function setStudioActiveSequenceVariant(
  p: WithoutSheetInstance<SheetAddress>,
  variant: SequenceVariantId,
): void {
  getStudio()!.transaction(({stateEditors}) => {
    stateEditors.studio.historic.projects.stateByProjectId.stateBySheetId.setActiveSequenceVariant(
      {...p, variant},
    )
  })
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
