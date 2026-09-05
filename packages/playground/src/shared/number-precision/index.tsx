import {getProject, types} from '@unseenco/theatre-core'
import studio from '@unseenco/theatre-studio'
import React from 'react'
import ReactDOM from 'react-dom/client'

studio.initialize({usePersistentStorage: false})

const project = getProject('Number precision demo', {
  numberPrecision: 2,
})

const sheet = project.sheet('Scene')

sheet.object('Box', {
  projectDefault: types.number(1.23456),
  propOverride: types.number(1.23456, {precision: 0}),
  highPrecision: types.number(1.23456, {precision: 5}),
})

function App() {
  return (
    <div
      style={{
        width: 120,
        height: 120,
        background: '#4a90d9',
        position: 'absolute',
        left: 200,
        top: 200,
      }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
