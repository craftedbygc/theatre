import type {
  PropTypeConfig,
  PropTypeConfig_Compound,
  PropTypeConfig_Enum,
  PropTypeConfig_Number,
} from '@unseenco/theatre-core/propTypes'
import type {UnknownValidCompoundProps} from '@unseenco/theatre-core/propTypes/internals'
import {round} from 'lodash-es'

export const DEFAULT_NUMBER_PRECISION = 3

export function resolveNumberPrecision(
  propPrecision: number | undefined,
  projectPrecision: number | undefined,
): number {
  if (propPrecision !== undefined) return propPrecision
  if (projectPrecision !== undefined) return projectPrecision
  return DEFAULT_NUMBER_PRECISION
}

export function roundNumberToPrecision(
  value: number,
  precision: number,
): number {
  if (!isFinite(value)) return value
  return round(value, precision)
}

export function applyNumberPrecisionDefaultsToPropConfig<
  T extends PropTypeConfig,
>(config: T, projectNumberPrecision: number | undefined): T {
  const defaultPrecision = resolveNumberPrecision(
    undefined,
    projectNumberPrecision,
  )

  if (config.type === 'number') {
    if (config.precision !== undefined) return config
    return {
      ...config,
      precision: defaultPrecision,
    }
  }

  if (config.type === 'compound') {
    return {
      ...config,
      props: mapCompoundProps(config, (subConfig) =>
        applyNumberPrecisionDefaultsToPropConfig(
          subConfig,
          projectNumberPrecision,
        ),
      ),
    } as T
  }

  if (config.type === 'enum') {
    return {
      ...config,
      cases: mapEnumCases(config, (subConfig) =>
        applyNumberPrecisionDefaultsToPropConfig(
          subConfig,
          projectNumberPrecision,
        ),
      ),
    } as T
  }

  return config
}

function mapCompoundProps(
  config: PropTypeConfig_Compound<UnknownValidCompoundProps>,
  fn: (subConfig: PropTypeConfig) => PropTypeConfig,
): PropTypeConfig_Compound<UnknownValidCompoundProps>['props'] {
  const props: PropTypeConfig_Compound<UnknownValidCompoundProps>['props'] = {}
  for (const [key, subConfig] of Object.entries(config.props)) {
    props[key] = fn(subConfig)
  }
  return props
}

function mapEnumCases(
  config: PropTypeConfig_Enum,
  fn: (subConfig: PropTypeConfig) => PropTypeConfig,
): PropTypeConfig_Enum['cases'] {
  const cases: PropTypeConfig_Enum['cases'] = {}
  for (const [key, subConfig] of Object.entries(config.cases)) {
    cases[key] = fn(subConfig)
  }
  return cases
}

export function getNumberPrecisionFromPropConfig(
  propConfig: PropTypeConfig_Number,
): number {
  return propConfig.precision ?? DEFAULT_NUMBER_PRECISION
}
