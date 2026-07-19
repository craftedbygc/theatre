import {getSequenceStateFromSheet} from '@theatre/core/sequences/sequenceVariants'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import getStudio from '@theatre/studio/getStudio'
import {getStudioActiveSequenceVariant} from '@theatre/studio/utils/activeSequenceVariant'
import type {PathToProp} from '@theatre/shared/utils/addresses'
import type {SequenceTrackId} from '@theatre/shared/utils/ids'
import {usePrism} from '@theatre/react'
import type {Pointer} from '@theatre/dataverse'
import {val} from '@theatre/dataverse'
import React from 'react'
import type {SequenceEditorPanelLayout} from '@theatre/studio/panels/SequenceEditorPanel/layout/layout'
import BasicKeyframedTrack from './BasicKeyframedTrack/BasicKeyframedTrack'
import type {graphEditorColors} from './GraphEditor'

const PrimitivePropGraph: React.FC<{
  layoutP: Pointer<SequenceEditorPanelLayout>
  sheetObject: SheetObject
  pathToProp: PathToProp
  trackId: SequenceTrackId
  color: keyof typeof graphEditorColors
}> = (props) => {
  return usePrism(() => {
    const {sheetObject, trackId} = props
    const sheetState = val(
      getStudio()!.atomP.historic.coreByProject[sheetObject.address.projectId]
        .sheetsById[sheetObject.address.sheetId],
    )
    const activeVariant = getStudioActiveSequenceVariant(sheetObject.sheet.address)
    const trackVariant =
      sheetObject.template.getSequenceVariantOwningTrack(trackId, activeVariant) ??
      activeVariant
    const trackData = getSequenceStateFromSheet(
      sheetState,
      trackVariant,
    )?.tracksByObject[sheetObject.address.objectKey]?.trackData[trackId]

    if (trackData?.type !== 'BasicKeyframedTrack') {
      console.error(
        `trackData type ${trackData?.type} is not yet supported on the graph editor`,
      )
      return <></>
    } else {
      return <BasicKeyframedTrack {...props} trackData={trackData} />
    }
  }, [props.trackId, props.layoutP])
}

export default PrimitivePropGraph
