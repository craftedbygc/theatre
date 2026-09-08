import type {PropTypeConfig_Image} from '@unseenco/theatre-core/propTypes'
import type {$FixMe} from '@unseenco/theatre-shared/utils/types'
import {Trash} from '@unseenco/theatre-studio/uiComponents/icons'
import React, {useCallback, useEffect, useLayoutEffect, useRef} from 'react'
import styled from 'styled-components'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  width: 100%;
  gap: 4px;
`

const AddImage = styled.div`
  position: absolute;
  inset: 0;
  --checker-color: #ededed36;
  &:hover {
    --checker-color: #ededed77;
  }
  // checkerboard background with 4px squares
  background-image: linear-gradient(
      45deg,
      var(--checker-color) 25%,
      transparent 25%
    ),
    linear-gradient(-45deg, var(--checker-color) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--checker-color) 75%),
    linear-gradient(-45deg, transparent 75%, var(--checker-color) 75%);
  background-size: 5px 5px;
`

const PreviewBox = styled.div`
  position: relative;
  cursor: pointer;
  box-sizing: border-box;

  height: 18px;
  width: 18px;
  flex: 0 0 auto;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;

  overflow: hidden;
  color: #ccc;
  &:hover {
    color: white;
  }

  border-radius: var(--studio-radius, 4px);
  border: 1px solid var(--studio-border);
`

// file input
const Input = styled.input.attrs({type: 'file'})`
  display: none;
`

const Preview = styled.img`
  position: absolute;
  inset: 0;
  height: 100%;
  aspect-ratio: 1;

  object-fit: cover;
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  background: transparent;
  color: #a8a8a9;
  cursor: pointer;

  border: none;
  height: 100%;
  aspect-ratio: 1/1;
  flex: 0 0 auto;

  opacity: 0;

  ${Container}:hover & {
    opacity: 0.8;
  }

  &:hover {
    opacity: 1;
    color: white;
  }
`

function ImagePropEditor({
  propConfig,
  editingTools,
  value,
  autoFocus,
  hostClickRef,
}: ISimplePropEditorReactProps<PropTypeConfig_Image>) {
  const [previewUrl, setPreviewUrl] = React.useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      setPreviewUrl(editingTools.getAssetUrl(value))
    } else {
      setPreviewUrl(undefined)
    }
  }, [value])

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  useLayoutEffect(() => {
    if (!hostClickRef) return
    hostClickRef.current = openFileDialog
    return () => {
      hostClickRef.current = null
    }
  }, [hostClickRef, openFileDialog])

  const onChange = useCallback(
    async (event: React.ChangeEvent<$FixMe>) => {
      const file = event.target.files[0]
      editingTools.permanentlySetValue({type: 'image', id: undefined})
      const imageId = await editingTools.createAsset(file)

      if (!imageId) {
        editingTools.permanentlySetValue(value)
      } else {
        editingTools.permanentlySetValue({
          type: 'image',
          id: imageId,
        })
      }
      event.target.value = null
    },
    [editingTools, value],
  )

  const empty = !value?.id

  return (
    <Container>
      <Input
        ref={inputRef}
        type="file"
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        accept="image/*,.hdr"
        autoFocus={autoFocus}
      />
      {!empty && (
        <DeleteButton
          title="Delete image"
          onClick={(e) => {
            e.stopPropagation()
            editingTools.permanentlySetValue({type: 'image', id: undefined})
          }}
        >
          <Trash />
        </DeleteButton>
      )}
      <PreviewBox
        title={
          empty ? 'Upload image' : `"${value.id}" (Click to upload new image)`
        }
        onClick={(e) => {
          e.stopPropagation()
          openFileDialog()
        }}
      >
        {previewUrl ? <Preview src={previewUrl} /> : <AddImage />}
      </PreviewBox>
    </Container>
  )
}

export default ImagePropEditor
