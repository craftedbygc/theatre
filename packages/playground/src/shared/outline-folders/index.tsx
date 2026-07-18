import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@theatre/studio'
import {getProject} from '@theatre/core'
import {Scene} from './Scene'

/**
 * Demonstrates `sheet.declareOutlineNamespace()` and
 * `sheet.setOutlineNamespaceCollapsed()` from `@theatre/core`.
 */

const project = getProject('Outline folders demo')
const sheet = project.sheet('Scene')

sheet.declareOutlineNamespace('Props', {collapsed: true})
sheet.declareOutlineNamespace('Empty Folder', {collapsed: true})

studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={project} />,
)
