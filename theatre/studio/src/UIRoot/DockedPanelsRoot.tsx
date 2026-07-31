import OutlinePanel from '@unseenco/theatre-studio/panels/OutlinePanel/OutlinePanel'
import DetailPanel from '@unseenco/theatre-studio/panels/DetailPanel/DetailPanel'
import React from 'react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {useVal} from '@unseenco/theatre-react'
import ExtensionPaneWrapper from '@unseenco/theatre-studio/panels/BasePanel/ExtensionPaneWrapper'
import SequenceEditorPanel from '@unseenco/theatre-studio/panels/SequenceEditorPanel/SequenceEditorPanel'
import DockedLayout, {
  DockedDetailsSlot,
  DockedOutlineSlot,
  DockedSequencerSlot,
  MeasuredDockedToolbarSlot,
  DockedViewportSlot,
} from './DockedLayout'
import GlobalToolbar from '@unseenco/theatre-studio/toolbars/GlobalToolbar'

const DockedPanelsRoot: React.FC = () => {
  const panes = useVal(getStudio().paneManager.allPanesD)
  const pinSequenceEditor = useVal(
    getStudio().atomP.ahistoric.pinSequenceEditor,
  )
  const paneEls = Object.entries(panes).map(([instanceId, paneInstance]) => {
    return (
      <ExtensionPaneWrapper
        key={`pane-${instanceId}`}
        paneInstance={paneInstance!}
      />
    )
  })

  return (
    <DockedLayout>
      <MeasuredDockedToolbarSlot>
        <GlobalToolbar />
      </MeasuredDockedToolbarSlot>
      <DockedOutlineSlot>
        <OutlinePanel />
      </DockedOutlineSlot>
      <DockedViewportSlot />
      <DockedDetailsSlot>
        <DetailPanel />
      </DockedDetailsSlot>
      {pinSequenceEditor !== false && (
        <DockedSequencerSlot>
          <SequenceEditorPanel />
        </DockedSequencerSlot>
      )}
      {paneEls}
    </DockedLayout>
  )
}

export default DockedPanelsRoot
