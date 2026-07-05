import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@theatre/studio'
import {getProject} from '@theatre/core'
import {Scene} from './Scene'

const project = getProject('Sample project')
studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Scene project={project} />,
)
