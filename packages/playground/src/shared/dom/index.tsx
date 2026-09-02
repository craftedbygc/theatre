import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {Scene} from './Scene'
import state from './dom.theatre-project-state.json'

/**
 * This is a basic example of using Theatre.js for manipulating the DOM.
 *
 * It also uses {@link IStudio.selection | studio.selection} to customize
 * the selection behavior.
 *
 * Saved state is loaded from `dom.theatre-project-state.json` so Studio can
 * compare live edits against the on-disk baseline (outer diamond indicator).
 */

studio.initialize({usePersistentStorage: false})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('Sample project', {state})} />,
)
