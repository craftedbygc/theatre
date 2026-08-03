export type ExcludeConfig = {
  transform?: readonly string[]
  material?: readonly string[]
  uniforms?: readonly string[]
}

/** A flat list applies to transform, material props, and uniforms. */
export type ExcludeInput = readonly string[] | ExcludeConfig

export type AutoAddObjectDefaults = {
  exclude?: ExcludeInput
  include?: ExcludeInput
  trackMaterial?: boolean
}

export type TheatreThreejsConfig = {
  autoAddObject?: AutoAddObjectDefaults
}

type ResolvedExcludeConfig = {
  transform: string[]
  material: string[]
  uniforms: string[]
}

let activeConfig: TheatreThreejsConfig = {}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}

export function mergeExcludeInput(
  ...inputs: (ExcludeInput | undefined)[]
): ResolvedExcludeConfig {
  const result: ResolvedExcludeConfig = {
    transform: [],
    material: [],
    uniforms: [],
  }

  for (const input of inputs) {
    if (!input) continue

    if (Array.isArray(input)) {
      result.transform.push(...input)
      result.material.push(...input)
      result.uniforms.push(...input)
      continue
    }

    const config = input as ExcludeConfig
    if (config.transform) {
      result.transform.push(...config.transform)
    }
    if (config.material) {
      result.material.push(...config.material)
    }
    if (config.uniforms) {
      result.uniforms.push(...config.uniforms)
    }
  }

  return {
    transform: dedupe(result.transform),
    material: dedupe(result.material),
    uniforms: dedupe(result.uniforms),
  }
}

export function getTheatreThreejsConfig(): TheatreThreejsConfig {
  return activeConfig
}

export function setTheatreThreejsConfig(config: TheatreThreejsConfig): void {
  activeConfig = config
}

export function resetTheatreThreejsConfig(): void {
  activeConfig = {}
}

export function configureTheatreThreejs(config: TheatreThreejsConfig): {
  reset: () => void
} {
  const previousConfig = activeConfig
  activeConfig = config

  return {
    reset() {
      activeConfig = previousConfig
    },
  }
}

export function resolveAutoAddObjectOptions(
  options: {
    exclude?: ExcludeInput
    include?: ExcludeInput
    trackMaterial?: boolean
  } = {},
): {
  exclude: ResolvedExcludeConfig
  include: ResolvedExcludeConfig
  trackMaterial?: boolean
} {
  const defaults = activeConfig.autoAddObject ?? {}

  return {
    exclude: mergeExcludeInput(defaults.exclude, options.exclude),
    include: mergeExcludeInput(defaults.include, options.include),
    trackMaterial: options.trackMaterial ?? defaults.trackMaterial,
  }
}
