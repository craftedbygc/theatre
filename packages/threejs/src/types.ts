/**
 * Minimal types compatible with `@unseenco/theatre-studio`'s `IExtension`.
 * Defined locally so this package can compile without depending on studio source.
 */
export type ToolConfigIcon = {
  type: 'Icon'
  svgSource: string
  title: string
  onClick: () => void
  selected?: boolean
}

export type ToolConfigOption = {
  value: string
  label: string
  svgSource: string
}

export type ToolConfigSwitch = {
  type: 'Switch'
  value: string
  onChange: (value: string) => void
  options: ToolConfigOption[]
}

export type ToolconfigFlyoutMenuItem = {
  label: string
  onClick?: () => void
}

export type ToolConfigFlyoutMenu = {
  type: 'Flyout'
  label: string
  items: ToolconfigFlyoutMenuItem[]
}

export type ToolConfig =
  | ToolConfigIcon
  | ToolConfigSwitch
  | ToolConfigFlyoutMenu

export type ToolsetConfig = Array<ToolConfig>

export interface TheatreExtension {
  id: string
  toolbars?: {
    [key in 'global' | string]: (
      set: (config: ToolsetConfig) => void,
      studio: unknown,
    ) => () => void
  }
}
