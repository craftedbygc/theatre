import React from 'react'
import ReactDOM from 'react-dom/client'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import ThreeScene from './ThreeScene'

studio.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThreeScene project={getProject('Three Basic')} />,
)
