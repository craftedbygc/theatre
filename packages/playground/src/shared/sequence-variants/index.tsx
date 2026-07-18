import React, {useEffect, useRef, useState} from 'react'
import {getProject, types} from '@theatre/core'
import studio from '@theatre/studio'
import extension from '@theatre/r3f/dist/extension'

studio.extend(extension)
studio.initialize()

const project = getProject('Sequence Variants Demo')
const sheet = project.sheet('Scene')
sheet.declareSequenceVariants(['default', 'mobile', 'desktop'])

const boxConfig = {
  x: types.number(0, {range: [-200, 200]}),
  y: types.number(0, {range: [-200, 200]}),
}

const SequenceVariantsDemo: React.FC = () => {
  const boxRef = useRef<HTMLDivElement>(null)
  const [activeVariant, setActiveVariant] = useState('default')

  useEffect(() => {
    const obj = sheet.object('Box', boxConfig)

    const unsubscribe = obj.onValuesChange((values, {variant}) => {
      setActiveVariant(variant)
      const el = boxRef.current
      if (!el) return
      el.style.transform = `translate(${values.x}px, ${values.y}px)`
    })

    return unsubscribe
  }, [])

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        padding: 24,
        color: '#eee',
        background: '#111',
        minHeight: '100vh',
      }}
    >
      <h1 style={{marginTop: 0}}>Sequence Variants</h1>
      <p>
        This sheet has three sequence variants: <code>default</code>,{' '}
        <code>mobile</code>, and <code>desktop</code>. Right-click the
        sequence diamond on a property in the detail panel to choose which
        variant to sequence.
      </p>
      <p>
        Active runtime variant: <strong>{activeVariant}</strong>
      </p>
      <div style={{display: 'flex', gap: 8, marginBottom: 24}}>
        {(['default', 'mobile', 'desktop'] as const).map((variant) => (
          <button
            key={variant}
            onClick={() => sheet.setActiveSequenceVariant(variant)}
            style={{
              padding: '8px 16px',
              background: activeVariant === variant ? '#339cb5' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {variant}
          </button>
        ))}
      </div>
      <div
        ref={boxRef}
        style={{
          width: 80,
          height: 80,
          background: '#e74c3c',
          borderRadius: 8,
        }}
      />
    </div>
  )
}

export default SequenceVariantsDemo
