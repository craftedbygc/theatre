export type UniformGuiOptions = {
  min?: number
  max?: number
  step?: number
}

export type UniformWithGui = {
  value: unknown
  gui?: UniformGuiOptions | Record<string, UniformGuiOptions | undefined>
}

export type ParsedUniformGuiOptions = {
  range?: [number, number]
  nudgeMultiplier?: number
}

export function parseUniformGui(
  uniform: UniformWithGui,
  component?: string,
): ParsedUniformGuiOptions {
  const opts: ParsedUniformGuiOptions = {}
  const gui = uniform.gui

  if (!gui) {
    return opts
  }

  const componentGui =
    component &&
    typeof gui === 'object' &&
    !('min' in gui || 'max' in gui || 'step' in gui)
      ? (gui as Record<string, UniformGuiOptions | undefined>)[component]
      : (gui as UniformGuiOptions)

  if (!componentGui) {
    return opts
  }

  if (componentGui.min !== undefined || componentGui.max !== undefined) {
    opts.range = [componentGui.min ?? -Infinity, componentGui.max ?? Infinity]
  }

  if (componentGui.step !== undefined) {
    opts.nudgeMultiplier = componentGui.step
  }

  return opts
}

export function numberTypeOptionsFromUniformGui(
  uniform: UniformWithGui,
  component?: string,
  defaults: ParsedUniformGuiOptions = {nudgeMultiplier: 0.01},
): {
  range?: [number, number]
  nudgeMultiplier?: number
} {
  const parsed = parseUniformGui(uniform, component)

  return {
    range: parsed.range ?? defaults.range,
    nudgeMultiplier: parsed.nudgeMultiplier ?? defaults.nudgeMultiplier,
  }
}
