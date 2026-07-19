import React, {useEffect, useRef, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {getProject, types} from '@unseenco/theatre-core'
import studio from '@unseenco/theatre-studio'

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
  const [previewVariant, setPreviewVariant] = useState('default')
  const [runtimeVariant, setRuntimeVariant] = useState('default')
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  // Switch runtime variant on resize (breakpoint-based)
  useEffect(() => {
    const applyVariantForWidth = (width: number) => {
      const variant = variantForWidth(width)
      sheet.setActiveSequenceVariant(variant)
      setRuntimeVariant(variant)
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
      setPreviewVariant(variant)
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
        This sheet has three variants: <code>default</code>, <code>mobile</code>
        , and <code>desktop</code>. The default variant lists all sheet objects.
        Right-click an object there and choose{' '}
        <code>Override in variant: …</code> to opt it into another variant
        folder. Values on <code>default</code> are inherited unless overridden
        in that variant. Resize below {MOBILE_BREAKPOINT}px to switch the
        runtime variant to <code>mobile</code>. While Studio is open, the
        preview follows the variant selected in the outline panel and is not
        affected by resize.
      </p>
      <p>
        Window width: <strong>{windowWidth}px</strong> — Runtime variant:{' '}
        <strong>{runtimeVariant}</strong> — Preview variant:{' '}
        <strong>{previewVariant}</strong>
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SequenceVariantsDemo />,
)
