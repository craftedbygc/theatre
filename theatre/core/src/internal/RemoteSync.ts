import type Project from '@theatre/core/projects/Project'
import type Sheet from '@theatre/core/sheets/Sheet'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type {Studio} from '@theatre/studio/Studio'
import {getCoreTicker} from '@theatre/core/coreTicker'
import type {SerializableMap} from '@theatre/shared/utils/types'
import {isRemoteEditorWindow} from './remoteEditor'

type BroadcastDataEvent =
  | 'setSheet'
  | 'setSheetObject'
  | 'updateSheetObject'
  | 'updateTimeline'
  | 'disconnect'

interface BroadcastData {
  event: BroadcastDataEvent
  data: any
}

/**
 * Mirrors this project's sheet objects, selection, and sequence position
 * across browser windows/tabs over a per-project `BroadcastChannel`, so that
 * a "remote editor" window (see `isRemoteEditorWindow()`) can drive every
 * other window's `sheet.object(...)` values with no app code changes.
 *
 * Every `Project` owns exactly one of these. It's a no-op (beyond one idle
 * `BroadcastChannel` listener) unless a remote editor window is actually
 * open somewhere.
 */
export default class RemoteSync {
  private readonly isEditor = isRemoteEditorWindow()
  private readonly channel: BroadcastChannel | undefined
  private readonly sheets = new Map<string, Sheet>()
  private readonly objects = new Map<string, SheetObject>()
  private studio: Studio | undefined
  private activeSheet: Sheet | undefined

  constructor(private readonly project: Project) {
    if (typeof BroadcastChannel === 'undefined') return

    this.channel = new BroadcastChannel(
      `theatre-remote:${project.address.projectId}`,
    )

    if (!this.isEditor) {
      this.channel.onmessage = (event: MessageEvent<BroadcastData>) => {
        this._handleIncoming(event.data)
      }
    } else {
      // Let every other window know to drop this window's overrides once
      // it goes away, since otherwise they'd be stuck with the last values
      // it broadcast (see `_handleIncoming`'s `'disconnect'` case).
      const channel = this.channel
      window.addEventListener('pagehide', () => {
        channel.postMessage({event: 'disconnect', data: {}})
      })
    }
  }

  registerSheet(sheet: Sheet) {
    this.sheets.set(sheet.address.sheetId, sheet)
  }

  registerObject(obj: SheetObject) {
    const id = `${obj.address.sheetId}_${obj.address.objectKey}`
    this.objects.set(id, obj)

    if (this.isEditor && this.channel) {
      const channel = this.channel
      obj.onFinalValueChange((values) => {
        const message: BroadcastData = {
          event: 'updateSheetObject',
          // Some prop values (e.g. rgba colors) are class instances with
          // methods attached, which `postMessage`'s structured clone can't
          // serialize. Round-tripping through JSON reduces them to plain,
          // cloneable data.
          data: {sheetObject: id, values: JSON.parse(JSON.stringify(values))},
        }
        channel.postMessage(message)
      })
    }
  }

  attachStudio(studio: Studio) {
    this.studio = studio
    if (!this.isEditor || !this.channel) return

    const channel = this.channel
    const projectId = this.project.address.projectId

    studio.publicApi.onSelectionChange((selection) => {
      for (const item of selection) {
        if (item.address.projectId !== projectId) continue

        if (item.type === 'Theatre_Sheet_PublicAPI') {
          this.activeSheet = this.sheets.get(item.address.sheetId)
          const message: BroadcastData = {
            event: 'setSheet',
            data: {sheet: item.address.sheetId},
          }
          channel.postMessage(message)
        } else if (item.type === 'Theatre_SheetObject_PublicAPI') {
          this.activeSheet = this.sheets.get(item.address.sheetId)
          const message: BroadcastData = {
            event: 'setSheetObject',
            data: {sheet: item.address.sheetId, key: item.address.objectKey},
          }
          channel.postMessage(message)
        }
      }
    })

    let lastPosition: number | undefined
    const ticker = getCoreTicker()
    const pollTimelinePosition = () => {
      if (this.activeSheet) {
        const position = this.activeSheet.publicApi.sequence.position
        if (position !== lastPosition) {
          lastPosition = position
          const message: BroadcastData = {
            event: 'updateTimeline',
            data: {sheet: this.activeSheet.address.sheetId, position},
          }
          channel.postMessage(message)
        }
      }
      ticker.onNextTick(pollTimelinePosition)
    }
    ticker.onNextTick(pollTimelinePosition)
  }

  private _handleIncoming(msg: BroadcastData) {
    switch (msg.event) {
      case 'setSheet': {
        const sheet = this.sheets.get(msg.data.sheet)
        if (sheet && this.studio) {
          this.activeSheet = sheet
          this.studio.publicApi.setSelection([sheet.publicApi])
        }
        break
      }
      case 'setSheetObject': {
        const obj = this.objects.get(`${msg.data.sheet}_${msg.data.key}`)
        if (obj && this.studio) {
          this.studio.publicApi.setSelection([obj.publicApi])
        }
        break
      }
      case 'updateSheetObject': {
        const obj = this.objects.get(msg.data.sheetObject)
        if (obj) obj.setRemoteOverride(msg.data.values as SerializableMap)
        break
      }
      case 'updateTimeline': {
        const sheet = this.sheets.get(msg.data.sheet)
        if (sheet) {
          this.activeSheet = sheet
          sheet.publicApi.sequence.position = msg.data.position
        }
        break
      }
      case 'disconnect': {
        for (const obj of this.objects.values()) {
          obj.setRemoteOverride({})
        }
        break
      }
    }
  }
}
