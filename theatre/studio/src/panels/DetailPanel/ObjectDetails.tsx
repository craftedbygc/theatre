import React from 'react'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {Pointer} from '@unseenco/theatre-dataverse'
import type {$FixMe} from '@unseenco/theatre-shared/utils/types'
import DeterminePropEditorForDetail from './DeterminePropEditorForDetail'
import {useVal} from '@unseenco/theatre-react'
import uniqueKeyForAnyObject from '@unseenco/theatre-shared/utils/uniqueKeyForAnyObject'
import styled from 'styled-components'

const ActionButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  border-radius: 2px;

  color: #a8a8a9;
  background: rgba(255, 255, 255, 0.1);

  border: none;
  height: 28px;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }
`

const ShowPropsOfSection = styled.fieldset`
  margin: 10px 6px 6px;
  padding: 4px 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 3px;
  min-width: 0;
`

const ShowPropsOfLegend = styled.legend`
  margin-left: 8px;
  padding: 0 6px;
  color: #a9a9a9;
  font-size: 10px;
  letter-spacing: 0.02em;
  text-transform: none;
`

const ShowPropsOfObjectSection: React.FC<{source: SheetObject}> = ({
  source,
}) => {
  const sourceConfig = useVal(source.template.configPointer)

  // Skip detached sources (still held in the runtime list but no longer on the sheet).
  if (!source.sheet.getObject(source.address.objectKey)) {
    return null
  }

  return (
    <ShowPropsOfSection>
      <ShowPropsOfLegend>{source.address.objectKey}</ShowPropsOfLegend>
      <DeterminePropEditorForDetail
        key={uniqueKeyForAnyObject(source)}
        obj={source}
        pointerToProp={source.propsP as Pointer<$FixMe>}
        propConfig={sourceConfig}
        visualIndentation={1}
      />
    </ShowPropsOfSection>
  )
}

const ObjectDetails: React.FC<{
  /** TODO: add support for multiple objects (it would show their common props) */
  objects: [SheetObject]
}> = ({objects}) => {
  const obj = objects[0]
  const config = useVal(obj.template.configPointer)
  const actions = useVal(obj.template._temp_actionsPointer)
  const showPropsOf = useVal(obj.template.showPropsOfPointer)

  return (
    <>
      <DeterminePropEditorForDetail
        // we don't use the object's address as the key because if a user calls `sheet.detachObject(key)` and later
        // calls `sheet.object(key)` with the same key, we want to re-render the object details panel.
        key={uniqueKeyForAnyObject(obj)}
        obj={obj}
        pointerToProp={obj.propsP as Pointer<$FixMe>}
        propConfig={config}
        visualIndentation={1}
      />
      {showPropsOf.map((source) => (
        <ShowPropsOfObjectSection
          key={uniqueKeyForAnyObject(source)}
          source={source}
        />
      ))}
      <ActionButtonContainer>
        {actions &&
          Object.entries(actions).map(([actionName, action]) => {
            return (
              <ActionButton
                key={actionName}
                onClick={() => {
                  action(obj.publicApi)
                }}
              >
                {actionName}
              </ActionButton>
            )
          })}
      </ActionButtonContainer>
    </>
  )
}

export default ObjectDetails
