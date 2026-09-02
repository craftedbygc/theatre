import type {FullStudioState} from '@unseenco/theatre-studio/store'
import {
  studioActions,
  studioReducer,
  tempActionGroup,
} from '@unseenco/theatre-studio/store'
import type {IStateEditors} from '@unseenco/theatre-studio/store/stateEditors'
import {setDrafts__onlyMeantToBeCalledByTransaction} from '@unseenco/theatre-studio/store/stateEditors'
import type {
  StudioAhistoricState,
  StudioEphemeralState,
  StudioHistoricState,
} from '@unseenco/theatre-studio/store/types'
import type {Deferred} from '@unseenco/theatre-shared/utils/defer'
import {defer} from '@unseenco/theatre-shared/utils/defer'
import atomFromReduxStore from '@unseenco/theatre-studio/utils/redux/atomFromReduxStore'
import configureStore from '@unseenco/theatre-studio/utils/redux/configureStore'
import type {VoidFn} from '@unseenco/theatre-shared/utils/types'
import type {Atom, Pointer} from '@unseenco/theatre-dataverse'
import type {Draft} from 'immer'
import {createDraft, finishDraft} from 'immer'
import type {Store} from 'redux'
import {
  __experimental_clearPersistentStorage,
  __experimental_clearProjectPersistentStorage,
  __experimental_clearStudioPersistentStorage,
  persistStateOfStudio,
} from './persistStateOfStudio'
import {
  resetProjectFieldsInPersistentState,
  resetStudioFieldsInPersistentState,
} from './resetPersistentState'
import type {OnDiskState} from '@unseenco/theatre-core/projects/store/storeTypes'
import {generateDiskStateRevision} from './generateDiskStateRevision'
import {
  createTransientPropPathsLookup,
  stripTransientPropsFromOnDiskState,
} from '@unseenco/theatre-shared/utils/transientPropPaths'
import {
  createObjectPropConfigLookup,
  stripDefaultPropValuesFromOnDiskState,
} from '@unseenco/theatre-shared/utils/defaultPropValues'

import createTransactionPrivateApi from './createTransactionPrivateApi'
import type {ProjectId} from '@unseenco/theatre-shared/utils/ids'

export type Drafts = {
  historic: Draft<StudioHistoricState>
  ahistoric: Draft<StudioAhistoricState>
  ephemeral: Draft<StudioEphemeralState>
}

export interface ITransactionPrivateApi {
  set<T>(pointer: Pointer<T>, value: T): void
  unset<T>(pointer: Pointer<T>): void
  drafts: Drafts
  stateEditors: IStateEditors
}

export type CommitOrDiscard = {
  commit: VoidFn
  discard: VoidFn
}

export default class StudioStore {
  private readonly _reduxStore: Store<FullStudioState>
  private readonly _atom: Atom<FullStudioState>
  readonly atomP: Pointer<FullStudioState>

  constructor() {
    this._reduxStore = configureStore({
      rootReducer: studioReducer,
      devtoolsOptions: {name: 'Theatre.js Studio'},
    })
    this._atom = atomFromReduxStore(this._reduxStore)
    this.atomP = this._atom.pointer
  }

  initialize(opts: {
    persistenceKey: string
    usePersistentStorage: boolean
  }): Promise<void> {
    const d: Deferred<void> = defer<void>()
    if (opts.usePersistentStorage === true) {
      persistStateOfStudio(
        this._reduxStore,
        () => {
          this.tempTransaction(({drafts}) => {
            drafts.ephemeral.initialised = true
          }).commit()
          d.resolve()
        },
        opts.persistenceKey,
      )
    } else {
      this.tempTransaction(({drafts}) => {
        drafts.ephemeral.initialised = true
      }).commit()

      d.resolve()
    }
    return d.promise
  }

  getState(): FullStudioState {
    return this._reduxStore.getState()
  }

  __experimental_clearPersistentStorage(
    persistenceKey: string,
  ): FullStudioState {
    __experimental_clearPersistentStorage(this._reduxStore, persistenceKey)
    return this.getState()
  }

  clearStudioPersistentStorage(persistenceKey: string): FullStudioState {
    __experimental_clearStudioPersistentStorage(this._reduxStore, persistenceKey)
    const resetState = resetStudioFieldsInPersistentState(
      this.getState().$persistent,
    )
    this._reduxStore.dispatch(studioActions.replacePersistentState(resetState))
    return this.getState()
  }

  clearProjectPersistentStorage(persistenceKey: string): FullStudioState {
    __experimental_clearProjectPersistentStorage(
      this._reduxStore,
      persistenceKey,
    )
    const resetState = resetProjectFieldsInPersistentState(
      this.getState().$persistent,
    )
    this._reduxStore.dispatch(studioActions.replacePersistentState(resetState))
    return this.getState()
  }

  /**
   * This method causes the store to start the history from scratch. This is useful
   * for testing and development where you want to explicitly provide a state to the
   * store.
   */
  __dev_startHistoryFromScratch(newHistoricPart: StudioHistoricState) {
    this._reduxStore.dispatch(
      studioActions.historic.startHistoryFromScratch(
        studioActions.reduceParts((s) => ({...s, historic: newHistoricPart})),
      ),
    )
  }

  tempTransaction(
    fn: (api: ITransactionPrivateApi) => void,
    opts?: {undoable?: boolean},
  ): CommitOrDiscard {
    const group = tempActionGroup()
    let errorDuringTransaction: Error | undefined = undefined

    const action = group.push(
      studioActions.reduceParts((wholeState) => {
        const drafts = {
          historic: createDraft(wholeState.historic),
          ahistoric: createDraft(wholeState.ahistoric),
          ephemeral: createDraft(wholeState.ephemeral),
        }

        let running = true

        let ensureRunning = () => {
          if (!running) {
            throw new Error(
              `You seem to have called the transaction api after studio.transaction() has finished running`,
            )
          }
        }

        const stateEditors = setDrafts__onlyMeantToBeCalledByTransaction(drafts)

        const api: ITransactionPrivateApi = createTransactionPrivateApi(
          ensureRunning,
          stateEditors,
          drafts,
          opts,
        )

        try {
          fn(api)
          running = false
          return {
            historic: finishDraft(drafts.historic),
            ahistoric: finishDraft(drafts.ahistoric),
            ephemeral: finishDraft(drafts.ephemeral),
          }
        } catch (err: unknown) {
          errorDuringTransaction = err as Error
          return wholeState
        } finally {
          setDrafts__onlyMeantToBeCalledByTransaction(undefined)
        }
      }),
    )

    this._reduxStore.dispatch(action)

    if (errorDuringTransaction) {
      this._reduxStore.dispatch(group.discard())
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw errorDuringTransaction
    }

    return {
      commit: () => {
        this._reduxStore.dispatch(group.commit())
      },
      discard: () => {
        this._reduxStore.dispatch(group.discard())
      },
    }
  }

  undo() {
    this._reduxStore.dispatch(studioActions.historic.undo())
  }

  redo() {
    this._reduxStore.dispatch(studioActions.historic.redo())
  }

  createContentOfSaveFile(projectId: ProjectId): OnDiskState {
    const projectState =
      this._reduxStore.getState().$persistent.historic.innerState.coreByProject[
        projectId
      ]

    if (!projectState) {
      throw new Error(`Project ${projectId} has not been initialized.`)
    }

    const revision = generateDiskStateRevision()

    this.tempTransaction(({stateEditors}) => {
      stateEditors.coreByProject.historic.revisionHistory.add({
        projectId,
        revision,
      })
    }).commit()

    const projectHistoricState =
      this._reduxStore.getState().$persistent.historic.innerState.coreByProject[
        projectId
      ]

    return stripDefaultPropValuesFromOnDiskState(
      stripTransientPropsFromOnDiskState(
        projectHistoricState,
        createTransientPropPathsLookup(projectId),
      ),
      createObjectPropConfigLookup(projectId),
    )
  }
}
