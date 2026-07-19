import React from 'react'
import ReactDOM from 'react-dom'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {Scene} from './App/Scene'

studio.initialize()

ReactDOM.render(
  <Scene project={getProject('Sample project')} />,
  document.getElementById('root')!,
)
