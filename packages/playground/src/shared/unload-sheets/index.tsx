import React, {useCallback, useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {getProject, types} from '@unseenco/theatre-core'
import type {IProject, ISheet, ISheetObject} from '@unseenco/theatre-core'
import studio from '@unseenco/theatre-studio'

/**
 * Exercises the runtime list/unload APIs:
 * - project.getSheets() / sheet.getObjects()
 * - sheet.detachObject(key)
 * - sheet.unload() / project.unloadSheet() / project.unloadSheets()
 *
 * Unload is runtime-only: recreate a sheet/object to see prior Studio values return.
 */

studio.initialize()

const project = getProject('Unload sheets demo')

const objectConfig = {
  x: types.number(40, {range: [0, 600]}),
  y: types.number(40, {range: [0, 400]}),
  color: types.rgba({r: 0.2, g: 0.6, b: 0.9, a: 1}),
}

type Snapshot = {
  sheets: {sheetId: string; instanceId: string; objectKeys: string[]}[]
}

function snapshot(project: IProject): Snapshot {
  return {
    sheets: project.getSheets().map((sheet) => ({
      sheetId: sheet.address.sheetId,
      instanceId: sheet.address.sheetInstanceId,
      objectKeys: sheet.getObjects().map((obj) => obj.address.objectKey),
    })),
  }
}

function ensureSheet(sheetId: string): ISheet {
  return project.sheet(sheetId)
}

function ensureObject(
  sheet: ISheet,
  key: string,
): ISheetObject<typeof objectConfig> {
  return sheet.object(key, objectConfig)
}

const UnloadSheetsDemo: React.FC = () => {
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(project))
  const [log, setLog] = useState<string[]>([])
  const [positions, setPositions] = useState<
    Record<string, {x: number; y: number; color: string}>
  >({})

  const refresh = useCallback((message?: string) => {
    setSnap(snapshot(project))
    if (message) {
      setLog((prev) => [message, ...prev].slice(0, 12))
    }
  }, [])

  // Subscribe to values for every currently attached object so boxes update live.
  useEffect(() => {
    const unsubs: Array<() => void> = []

    for (const sheet of project.getSheets()) {
      for (const obj of sheet.getObjects()) {
        const id = `${sheet.address.sheetId}/${obj.address.objectKey}`
        unsubs.push(
          obj.onValuesChange((v) => {
            setPositions((prev) => ({
              ...prev,
              [id]: {
                x: v.x,
                y: v.y,
                color: `rgba(${Math.round(v.color.r * 255)}, ${Math.round(
                  v.color.g * 255,
                )}, ${Math.round(v.color.b * 255)}, ${v.color.a})`,
              },
            }))
          }),
        )
      }
    }

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [snap])

  const addSheet = (sheetId: string) => {
    ensureSheet(sheetId)
    refresh(`Loaded sheet "${sheetId}"`)
  }

  const addObject = (sheetId: string, key: string) => {
    const sheet = ensureSheet(sheetId)
    ensureObject(sheet, key)
    refresh(`Attached object "${key}" on "${sheetId}"`)
  }

  const detachObject = (sheetId: string, key: string) => {
    const sheet = project.getSheets().find((s) => s.address.sheetId === sheetId)
    if (!sheet) return
    sheet.detachObject(key)
    setPositions((prev) => {
      const next = {...prev}
      delete next[`${sheetId}/${key}`]
      return next
    })
    refresh(`Detached object "${key}" from "${sheetId}"`)
  }

  const unloadSheet = (sheetId: string) => {
    const keys = snap.sheets
      .find((s) => s.sheetId === sheetId)
      ?.objectKeys.map((k) => `${sheetId}/${k}`)
    project.unloadSheet(sheetId)
    if (keys) {
      setPositions((prev) => {
        const next = {...prev}
        for (const id of keys) delete next[id]
        return next
      })
    }
    refresh(`Unloaded sheet "${sheetId}"`)
  }

  const unloadAll = () => {
    project.unloadSheets()
    setPositions({})
    refresh('Unloaded all sheets')
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        color: '#e8e8e8',
        background: '#141416',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{marginTop: 0, fontSize: 22}}>Unload sheets / objects</h1>
      <p style={{maxWidth: 640, lineHeight: 1.45, color: '#aaa'}}>
        Load sheets and objects, tweak them in Studio, then detach or unload via
        the buttons. Unload is runtime-only — recreate the same sheet/object to
        get previous values back. Watch the Studio outline as you unload.
      </p>

      <div
        style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16}}
      >
        <Btn onClick={() => addSheet('Scene A')}>Load Scene A</Btn>
        <Btn onClick={() => addSheet('Scene B')}>Load Scene B</Btn>
        <Btn onClick={() => addObject('Scene A', 'Box 1')}>
          Attach Box 1 → Scene A
        </Btn>
        <Btn onClick={() => addObject('Scene A', 'Box 2')}>
          Attach Box 2 → Scene A
        </Btn>
        <Btn onClick={() => addObject('Scene B', 'Box 1')}>
          Attach Box 1 → Scene B
        </Btn>
        <Btn onClick={unloadAll} danger>
          Unload all sheets
        </Btn>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <div>
          <h2 style={{fontSize: 16, margin: '0 0 8px'}}>
            Loaded ({snap.sheets.length} sheets)
          </h2>
          {snap.sheets.length === 0 ? (
            <p style={{color: '#777', margin: 0}}>Nothing loaded.</p>
          ) : (
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
              {snap.sheets.map((sheet) => (
                <li
                  key={`${sheet.sheetId}:${sheet.instanceId}`}
                  style={{
                    border: '1px solid #333',
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 10,
                    background: '#1c1d20',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <strong>{sheet.sheetId}</strong>
                    <Btn
                      onClick={() => unloadSheet(sheet.sheetId)}
                      danger
                      small
                    >
                      Unload sheet
                    </Btn>
                  </div>
                  {sheet.objectKeys.length === 0 ? (
                    <div style={{color: '#666', fontSize: 13}}>No objects</div>
                  ) : (
                    sheet.objectKeys.map((key) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 6,
                          fontSize: 13,
                        }}
                      >
                        <span>{key}</span>
                        <Btn
                          onClick={() => detachObject(sheet.sheetId, key)}
                          small
                        >
                          Detach
                        </Btn>
                      </div>
                    ))
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 style={{fontSize: 16, margin: '20px 0 8px'}}>Log</h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: 12,
              color: '#8a8a8a',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {log.length === 0 ? (
              <li>Actions appear here.</li>
            ) : (
              log.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)
            )}
          </ul>
        </div>

        <div
          style={{
            position: 'relative',
            minHeight: 420,
            border: '1px dashed #333',
            borderRadius: 8,
            background: '#0e0f11',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 12,
              fontSize: 12,
              color: '#666',
            }}
          >
            Live objects (drag props in Studio)
          </div>
          {Object.entries(positions).map(([id, pos]) => (
            <div
              key={id}
              title={id}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: 72,
                height: 72,
                borderRadius: 8,
                background: pos.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
              }}
            >
              {id.split('/')[1]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  danger,
  small,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: '1px solid ' + (danger ? '#833' : '#444'),
        background: danger ? '#3a1818' : '#222',
        color: danger ? '#fbb' : '#eee',
        borderRadius: 5,
        padding: small ? '3px 8px' : '6px 12px',
        fontSize: small ? 12 : 13,
      }}
    >
      {children}
    </button>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <UnloadSheetsDemo />,
)
