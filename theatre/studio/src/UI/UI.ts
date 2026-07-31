import type {Studio} from '@unseenco/theatre-studio/Studio'
import {val} from '@unseenco/theatre-dataverse'
import type {IDockedViewport} from './dockedViewport'
import {
  getDockedViewport,
  onDockedResize,
  onDockedToggle,
} from './dockedViewport'
import getStudio from '@unseenco/theatre-studio/getStudio'

const NonSSRBitsClass =
  typeof window !== 'undefined'
    ? import('./UINonSSRBits').then((M) => M.default)
    : null

export default class UI {
  private _rendered = false
  private _nonSSRBits = NonSSRBitsClass
    ? NonSSRBitsClass.then((NonSSRBitsClass) => new NonSSRBitsClass())
    : Promise.reject()
  readonly ready: Promise<void> = this._nonSSRBits.then(
    () => undefined,
    () => undefined,
  )

  constructor(readonly studio: Studio) {}

  render() {
    if (this._rendered) {
      return
    }
    this._rendered = true

    this._nonSSRBits
      .then((b) => {
        b.render()
      })
      .catch((err) => {
        console.error(err)
        throw err
      })
  }

  hide() {
    this.studio.transaction(({drafts}) => {
      drafts.ahistoric.visibilityState = 'everythingIsHidden'
    })
  }

  restore() {
    this.render()
    this.studio.transaction(({drafts}) => {
      drafts.ahistoric.visibilityState = 'everythingIsVisible'
    })
  }

  get isHidden() {
    return (
      val(this.studio.atomP.ahistoric.visibilityState) === 'everythingIsHidden'
    )
  }

  /**
   * Whether the studio is in docked layout mode.
   */
  get isDocked(): boolean {
    return val(getStudio().atomP.historic.dockedMode) ?? false
  }

  /**
   * The inner viewport rectangle when docked layout mode is active and the
   * studio is visible. `null` when floating or when the studio is hidden.
   */
  get dockedViewport(): IDockedViewport | null {
    return getDockedViewport()
  }

  /**
   * Listen for changes to docked layout mode. Called immediately with the
   * current value.
   */
  onDockedToggle(listener: (docked: boolean) => void) {
    return onDockedToggle(listener)
  }

  /**
   * Listen for changes to the inner viewport size/position while docked.
   * Called immediately with the current viewport if docked.
   */
  onDockedResize(listener: (viewport: IDockedViewport | null) => void) {
    return onDockedResize(listener)
  }

  renderToolset(toolsetId: string, htmlNode: HTMLElement) {
    let shouldUnmount = false

    let unmount: null | (() => void) = null

    this._nonSSRBits
      .then((nonSSRBits) => {
        if (shouldUnmount) return // unmount requested before the toolset is mounted, so, abort
        unmount = nonSSRBits.renderToolset(toolsetId, htmlNode)
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      if (unmount) {
        unmount()
        return
      }
      if (shouldUnmount) return
      shouldUnmount = true
    }
  }
}
