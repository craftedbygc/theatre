import React, {useEffect, useRef} from 'react'
import type {CSSProperties} from 'react'
import type {IProject} from '@theatre/core'
import {types} from '@theatre/core'
import {Box3D} from './Box3D'

// Scene

const SceneCSS: CSSProperties = {
  overflow: 'hidden',
  position: 'absolute',
  left: '0',
  right: '0',
  top: '0',
  bottom: '0',
}

export const Scene: React.FC<{project: IProject}> = ({project}) => {
  const containerRef = useRef<HTMLDivElement>(null!)
  const sheet = project.sheet('DOM')

  useEffect(() => {
    const container = containerRef.current!
    const sheetObj = sheet.object('Container', {
      perspective: types.number(
        Math.max(window.innerWidth, window.innerHeight),
        {range: [0, 2000]},
      ),
      originX: types.number(50, {range: [0, 100]}),
      originY: types.number(50, {range: [0, 100]}),
    })
    const unsubscribe = sheetObj.onValuesChange((values) => {
      container.style.perspective = `${values.perspective}px`
      container.style.perspectiveOrigin = `${values.originX}% ${values.originY}%`
    })
    return unsubscribe
  }, [])

  return (
    <div ref={containerRef} style={SceneCSS}>
      <Box3D sheet={sheet} name="Box" x={100} y={100} />
    </div>
  )
}
