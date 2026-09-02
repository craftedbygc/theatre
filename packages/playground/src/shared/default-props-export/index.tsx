import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {Scene} from './Scene'

/**
 * Demo: exported project state JSON should only include props that differ from
 * their defaults. Use the on-page button to inspect `createContentOfSaveFile()`.
 */
studio.initialize({usePersistentStorage: false})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={getProject('Default props export demo')} />,
)
