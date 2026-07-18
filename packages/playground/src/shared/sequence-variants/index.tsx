import React, {useEffect, useRef, useState} from 'react'
import {getProject, types} from '@theatre/core'
import studio from '@theatre/studio'
import extension from '@theatre/r3f/dist/extension'

studio.extend(extension)
studio.initialize()

const project = getProject('Sequence Variants Demo')
const sheet = project.sheet('Scene')
sheet.declareSequenceVariants(['default', 'mobile', 'desktop'])

const MOBILE_BREAKPOINT = 768

const boxConfig = {
  x: types.number(0, {range: [-200, 200]}),
  y: types.number(0, {range: [-200, 200]}),
}

function variantForWidth(width: number): 'mobile' | 'desktop' {
  return width < MOBILE_BREAKPOINT ? 'mobile' : 'desktop'
}

const SequenceVariantsDemo: React.FC = () => {
  const boxRef = useRef<HTMLDivElement>(null)
  const [activeVariant, setActiveVariant] = useState('default')
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  // Switch runtime variant on resize (breakpoint-based)
  useEffect(() => {
    const applyVariantForWidth = (width: number) => {
      const variant = variantForWidth(width)
      sheet.setActiveSequenceVariant(variant)
      setWindowWidth(width)
    }

    applyVariantForWidth(window.innerWidth)

    const onResize = () => applyVariantForWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
        <code>mobile</code>, and <code>desktop</code>. Resize the window below{' '}
        {MOBILE_BREAKPOINT}px to automatically switch to the <code>mobile</code>{' '}
        variant; above that uses <code>desktop</code>.
      </p>
      <p>
        Window width: <strong>{windowWidth}px</strong> — Active runtime variant:{' '}
        <strong>{activeVariant}</strong>
      </p>
      <p style={{color: '#888', fontSize: 14}}>
        Right-click the sequence diamond on a property in the detail panel to
        choose which variant to sequence in the studio.
      </p>
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
