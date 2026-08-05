import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {Scene} from './Scene'

/**
 * Demo for {@link ISheetObject.showPropsOf}: several DOM boxes share one
 * Appearance object. Selecting a box in Studio shows Appearance props in a
 * fieldset; sequencing those props writes tracks on Appearance, not the box.
 */
studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('showPropsOf demo')} />,
)
