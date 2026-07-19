import React, {useEffect, useRef} from 'react'
import type {CSSProperties} from 'react'
import type {IProject} from '@unseenco/theatre-core'
import {types} from '@unseenco/theatre-core'

const SceneCSS: CSSProperties = {
  overflow: 'hidden',
  position: 'absolute',
  left: '0',
  right: '0',
  top: '0',
  bottom: '0',
  background: '#171717',
  color: 'white',
  fontFamily: 'sans-serif',
  padding: '24px',
}

const BoxCSS: CSSProperties = {
  position: 'absolute',
  width: '80px',
  height: '80px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  textAlign: 'center',
}

const propNames = [
  'Chair',
  'Table',
  'Lamp',
  'Plant',
  'Bookshelf',
  'Rug',
  'Vase',
  'Clock',
]

function PropBox(props: {
  sheet: ReturnType<IProject['sheet']>
  name: string
  index: number
}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const {sheet, name, index} = props

  useEffect(() => {
    const element = elementRef.current!
    const sheetObj = sheet.object(`Props / ${name}`, {
      background: types.rgba({
        r: ((index * 37) % 255) / 255,
        g: ((index * 73) % 255) / 255,
        b: ((index * 113) % 255) / 255,
        a: 1,
      }),
      position: {
        x: 40 + (index % 4) * 110,
        y: 120 + Math.floor(index / 4) * 110,
        z: 0,
      },
    })

    const unsubscribe = sheetObj.onValuesChange((values) => {
      const {background, position} = values
      element.style.backgroundColor = `rgba(${background.r * 255}, ${
        background.g * 255
      }, ${background.b * 255}, 1)`
      element.style.transform = `translate3d(${position.x}px, ${position.y}px, ${position.z}px)`
    })

    return unsubscribe
  }, [sheet, name, index])

  return (
    <div ref={elementRef} style={BoxCSS}>
      {name}
    </div>
  )
}

export const Scene: React.FC<{project: IProject}> = ({project}) => {
  const sheet = project.sheet('Scene')

  return (
    <div style={SceneCSS}>
      <h1 style={{marginTop: 0}}>Outline folder namespaces</h1>
      <p>
        Open the outline panel on the left. The <strong>Props</strong> folder is
        collapsed by default via <code>sheet.declareOutlineNamespace()</code>.
        There is also an empty <strong>Empty Folder</strong> declared ahead of
        time.
      </p>
      {propNames.map((name, index) => (
        <PropBox key={name} sheet={sheet} name={name} index={index} />
      ))}
      <p style={{position: 'absolute', bottom: 24, left: 24, right: 24}}>
        Sheet: {sheet.address.sheetId}
      </p>
    </div>
  )
}
