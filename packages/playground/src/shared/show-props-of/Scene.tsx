import React, {useEffect, useMemo, useRef} from 'react'
import type {CSSProperties} from 'react'
import type {IProject, ISheet, ISheetObject} from '@unseenco/theatre-core'
import {types} from '@unseenco/theatre-core'

const BoxSize = 120

const SceneCSS: CSSProperties = {
  overflow: 'hidden',
  position: 'absolute',
  inset: 0,
  background: '#1a1c1f',
}

const BoxCSS: CSSProperties = {
  position: 'absolute',
  width: `${BoxSize}px`,
  height: `${BoxSize}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  userSelect: 'none',
}

type AppearanceValues = {
  color: {r: number; g: number; b: number; a: number}
  borderRadius: number
  opacity: number
}

function applyAppearance(el: HTMLElement, appearance: AppearanceValues): void {
  const {color, borderRadius, opacity} = appearance
  el.style.backgroundColor = `rgba(${color.r * 255}, ${color.g * 255}, ${
    color.b * 255
  }, ${color.a})`
  el.style.borderRadius = `${borderRadius}px`
  el.style.opacity = String(opacity)
}

const Box: React.FC<{
  sheet: ISheet
  name: string
  x: number
  y: number
  appearance: ISheetObject<any>
  /** When true, link Appearance via object.showPropsOf() after create. */
  linkRetroactively?: boolean
}> = ({sheet, name, x, y, appearance, linkRetroactively = false}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current!
    const box = sheet.object(
      `Box / ${name}`,
      {
        position: {
          x,
          y,
        },
      },
      linkRetroactively ? undefined : {showPropsOf: [appearance]},
    )

    if (linkRetroactively) {
      box.showPropsOf([appearance])
    }

    const unsubBox = box.onValuesChange((values) => {
      el.style.transform = `translate(${values.position.x}px, ${values.position.y}px)`
    })

    const unsubAppearance = appearance.onValuesChange((values) => {
      applyAppearance(el, values as AppearanceValues)
    })

    return () => {
      unsubBox()
      unsubAppearance()
    }
  }, [sheet, name, x, y, appearance, linkRetroactively])

  return (
    <div ref={ref} style={BoxCSS}>
      {name}
    </div>
  )
}

export const Scene: React.FC<{project: IProject}> = ({project}) => {
  const sheet = useMemo(() => project.sheet('Boxes'), [project])

  const appearance = useMemo(
    () =>
      sheet.object('Appearance', {
        color: types.rgba({r: 0.25, g: 0.55, b: 0.9, a: 1}),
        borderRadius: types.number(12, {range: [0, 60], nudgeMultiplier: 1}),
        opacity: types.number(1, {range: [0, 1], nudgeMultiplier: 0.01}),
      }),
    [sheet],
  )

  const padding = 80
  const gap = BoxSize + 40

  return (
    <div style={SceneCSS}>
      <Box
        sheet={sheet}
        name="A"
        x={padding}
        y={padding}
        appearance={appearance}
      />
      <Box
        sheet={sheet}
        name="B"
        x={padding + gap}
        y={padding}
        appearance={appearance}
      />
      <Box
        sheet={sheet}
        name="C (retro)"
        x={padding + gap * 2}
        y={padding}
        appearance={appearance}
        linkRetroactively
      />
    </div>
  )
}
