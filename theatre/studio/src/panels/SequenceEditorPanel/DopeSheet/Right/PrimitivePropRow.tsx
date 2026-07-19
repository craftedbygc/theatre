import type {SequenceEditorPanelLayout} from '@theatre/studio/panels/SequenceEditorPanel/layout/layout'
import type {SequenceEditorTree_PrimitiveProp} from '@theatre/studio/panels/SequenceEditorPanel/layout/tree'
import {getSequenceStateFromSheet} from '@theatre/core/sequences/sequenceVariants'
import getStudio from '@theatre/studio/getStudio'
import {getStudioActiveSequenceVariant} from '@theatre/studio/utils/activeSequenceVariant'
import {usePrism} from '@theatre/react'
import type {Pointer} from '@theatre/dataverse'
import {val} from '@theatre/dataverse'
import React from 'react'
import RightRow from './Row'
import BasicKeyframedTrack from './BasicKeyframedTrack/BasicKeyframedTrack'
import {useLogger} from '@theatre/studio/uiComponents/useLogger'

const PrimitivePropRow: React.VFC<{
  leaf: SequenceEditorTree_PrimitiveProp
  layoutP: Pointer<SequenceEditorPanelLayout>
}> = ({leaf, layoutP}) => {
  const logger = useLogger('PrimitivePropRow', leaf.pathToProp.join())
  return usePrism(() => {
    const {sheetObject} = leaf
    const {trackId} = leaf

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
      logger.errorDev(
        `trackData type ${trackData?.type} is not yet supported on the sequence editor`,
      )
      return (
        <RightRow leaf={leaf} isCollapsed={false} node={<div />}></RightRow>
      )
    } else {
      const node = (
        <BasicKeyframedTrack
          layoutP={layoutP}
          trackData={trackData}
          leaf={leaf}
        />
      )

      return <RightRow leaf={leaf} isCollapsed={false} node={node}></RightRow>
    }
  }, [leaf, layoutP])
}

export default PrimitivePropRow
