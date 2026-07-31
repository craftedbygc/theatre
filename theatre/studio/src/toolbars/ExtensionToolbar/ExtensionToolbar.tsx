import {Atom} from '@unseenco/theatre-dataverse'
import {useVal} from '@unseenco/theatre-react'
import type {IExtension} from '@unseenco/theatre-studio'
import getStudio from '@unseenco/theatre-studio/getStudio'
import type {ToolsetConfig} from '@unseenco/theatre-studio/TheatreStudio'
import React, {useLayoutEffect, useMemo} from 'react'

import styled, {css} from 'styled-components'
import Toolset from './Toolset'
import {useLayoutMode} from '@unseenco/theatre-studio/UIRoot/LayoutModeContext'
import {DOCKED_TOOLBAR_BUTTON_SIZE} from '@unseenco/theatre-studio/UIRoot/dockedLayoutConstants'

const Container = styled.div<{$docked: boolean}>`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  height: 36px;

  ${({$docked}) =>
    $docked &&
    css`
      align-items: center;
      height: auto;
      min-height: ${DOCKED_TOOLBAR_BUTTON_SIZE}px;
    `};
`

const GroupDivider = styled.div`
  position: abolute;
  height: 32px;
  width: 1px;
  background: #373b40;
  opacity: 0.4;
`

const ExtensionToolsetRender: React.FC<{
  extension: IExtension
  toolbarId: string
}> = ({extension, toolbarId}) => {
  const toolsetConfigBox = useMemo(() => new Atom<ToolsetConfig>([]), [])

  const attachFn = extension.toolbars?.[toolbarId]

  useLayoutEffect(() => {
    const detach = attachFn?.(
      toolsetConfigBox.set.bind(toolsetConfigBox),
      getStudio()!.publicApi,
    )

    if (typeof detach === 'function') return detach
  }, [extension, toolbarId, attachFn])

  const config = useVal(toolsetConfigBox.prism)

  return <Toolset config={config} />
}

export const ExtensionToolbar: React.FC<{
  toolbarId: string
  showLeftDivider?: boolean
}> = ({toolbarId, showLeftDivider}) => {
  const {isDocked} = useLayoutMode()
  const groups: Array<React.ReactNode> = []
  const extensionsById = useVal(getStudio().atomP.ephemeral.extensions.byId)

  let isAfterFirstGroup = false
  for (const [, extension] of Object.entries(extensionsById)) {
    if (!extension || !extension.toolbars?.[toolbarId]) continue

    groups.push(
      <React.Fragment key={'extensionToolbar-' + extension.id}>
        {isAfterFirstGroup ? <GroupDivider></GroupDivider> : undefined}
        <ExtensionToolsetRender extension={extension} toolbarId={toolbarId} />
      </React.Fragment>,
    )

    isAfterFirstGroup = true
  }

  if (groups.length === 0) return null

  return (
    <Container
      $docked={isDocked}
      data-testid={`theatre-extensionToolbar-${toolbarId}`}
    >
      {showLeftDivider ? <GroupDivider></GroupDivider> : undefined}
      {groups}
    </Container>
  )
}

export default ExtensionToolbar
