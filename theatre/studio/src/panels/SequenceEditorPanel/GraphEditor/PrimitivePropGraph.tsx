import {getSequenceStateFromSheet} from '@unseenco/theatre-studio/utils/sequenceVariantHelpers'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {getStudioActiveSequenceVariant} from '@unseenco/theatre-studio/utils/activeSequenceVariant'
import type {PathToProp} from '@unseenco/theatre-shared/utils/addresses'
import type {SequenceTrackId} from '@unseenco/theatre-shared/utils/ids'
import {usePrism} from '@unseenco/theatre-react'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {val} from '@unseenco/theatre-dataverse'
import React from 'react'
import type {SequenceEditorPanelLayout} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/layout/layout'
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
    const activeVariant = getStudioActiveSequenceVariant(
      sheetObject.sheet.address,
    )
    const trackVariant =
      sheetObject.template.getSequenceVariantOwningTrack(
        trackId,
        activeVariant,
      ) ?? activeVariant
    const trackData = getSequenceStateFromSheet(sheetState, trackVariant)
      ?.tracksByObject[sheetObject.address.objectKey]?.trackData[trackId]

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
