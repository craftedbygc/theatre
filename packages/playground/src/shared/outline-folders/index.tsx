import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@theatre/studio'
import {getProject} from '@theatre/core'
import {Scene} from './Scene'

/**
 * Demonstrates `studio.ui.outline.declareNamespace()` and
 * `studio.ui.outline.setNamespaceCollapsed()`.
 */

const project = getProject('Outline folders demo')
const sheet = project.sheet('Scene')

studio.ui.outline.declareNamespace(sheet, 'Props', {collapsed: true})
studio.ui.outline.declareNamespace(sheet, 'Empty Folder', {collapsed: true})

studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={project} />,
)
