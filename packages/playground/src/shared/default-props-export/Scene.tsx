import React, {useCallback, useState} from 'react'
import type {CSSProperties} from 'react'
import type {IProject, ISheet} from '@unseenco/theatre-core'
import {onChange, types} from '@unseenco/theatre-core'
import getStudio from '@unseenco/theatre-studio/getStudio'

const boxConfig = {
  x: types.number(40, {range: [0, 500], label: 'X'}),
  y: types.number(40, {range: [0, 500], label: 'Y'}),
  width: types.number(120, {range: [40, 400], label: 'Width'}),
  height: types.number(120, {range: [40, 400], label: 'Height'}),
  color: types.rgba({r: 0.2, g: 0.5, b: 1, a: 1}),
}

const sceneStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top left, #1f2937 0%, #0f172a 55%, #020617 100%)',
  color: '#e2e8f0',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 360,
  maxHeight: 'calc(100% - 32px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
}

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(96, 165, 250, 0.45)',
  background: 'rgba(37, 99, 235, 0.25)',
  color: '#eff6ff',
  borderRadius: 8,
  padding: '10px 12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const jsonStyle: CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 8,
  background: '#020617',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  overflow: 'auto',
  maxHeight: 420,
  fontSize: 12,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const Box: React.FC<{
  sheet: ISheet
  name: string
}> = ({sheet, name}) => {
  const obj = sheet.object(name, boxConfig)
  const divRef = React.useRef<HTMLDivElement>(null!)

  React.useLayoutEffect(() => {
    return onChange(obj.props, ({x, y, width, height, color}) => {
      const el = divRef.current
      el.style.transform = `translate(${x}px, ${y}px)`
      el.style.width = `${width}px`
      el.style.height = `${height}px`
      el.style.background = `rgba(${color.r * 255}, ${color.g * 255}, ${
        color.b * 255
      }, ${color.a})`
    })
  }, [obj])

  return (
    <div
      ref={divRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        borderRadius: 12,
        border: '2px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
      }}
    />
  )
}

export const Scene: React.FC<{project: IProject}> = ({project}) => {
  const sheet = project.sheet('Boxes')
  const [exportedJson, setExportedJson] = useState('')

  const showExportedState = useCallback(() => {
    const json = getStudio().createContentOfSaveFile(project.address.projectId)
    setExportedJson(JSON.stringify(json, null, 2))
  }, [project.address.projectId])

  return (
    <div style={sceneStyle}>
      <Box sheet={sheet} name="Box A" />
      <Box sheet={sheet} name="Box B" />

      <div style={panelStyle}>
        <div>
          <strong>Default props export demo</strong>
          <p style={{margin: '8px 0 0', color: '#94a3b8', fontSize: 14}}>
            Edit a box in Studio, export the JSON, then undo or reset the prop
            to its default. Only changed values should remain in the exported
            state.
          </p>
        </div>

        <button type="button" style={buttonStyle} onClick={showExportedState}>
          Show exported state JSON
        </button>

        {exportedJson ? <pre style={jsonStyle}>{exportedJson}</pre> : null}
      </div>
    </div>
  )
}
