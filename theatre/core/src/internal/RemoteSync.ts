import type Project from '@theatre/core/projects/Project'
import type {
  ProjectAhistoricState,
  ProjectState_Historic,
} from '@theatre/core/projects/store/storeTypes'
import type Sheet from '@theatre/core/sheets/Sheet'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type {Studio} from '@theatre/studio/Studio'
import {getCoreTicker} from '@theatre/core/coreTicker'
import {val} from '@theatre/dataverse'
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

type DisconnectData = {
  historic?: ProjectState_Historic
  ahistoric?: ProjectAhistoricState
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
      // Before disconnecting, push the editor's project state to listeners so
      // they keep the edits made in the remote window (not just the transient
      // override layer). Then drop overrides (see `'disconnect'` in
      // `_handleIncoming`).
      const channel = this.channel
      window.addEventListener('pagehide', () => {
        const data: DisconnectData = {}
        if (this.studio) {
          const projectId = this.project.address.projectId
          const historic = val(
            this.studio.atomP.historic.coreByProject[projectId],
          )
          const ahistoric = val(
            this.studio.atomP.ahistoric.coreByProject[projectId],
          )
          if (historic) {
            data.historic = JSON.parse(JSON.stringify(historic))
            if (ahistoric) {
              data.ahistoric = JSON.parse(JSON.stringify(ahistoric))
            }
          }
        }
        channel.postMessage({event: 'disconnect', data})
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
        const {historic, ahistoric} = msg.data as DisconnectData
        if (historic && this.studio) {
          const projectId = this.project.address.projectId
          this.studio.transaction(({drafts}) => {
            drafts.historic.coreByProject[projectId] = historic
            if (ahistoric) {
              drafts.ahistoric.coreByProject[projectId] = ahistoric
            }
            drafts.ephemeral.coreByProject[projectId]!.loadingState = {
              type: 'loaded',
            }
          })
        }
        for (const obj of this.objects.values()) {
          obj.setRemoteOverride({})
        }
        break
      }
    }
  }
}
