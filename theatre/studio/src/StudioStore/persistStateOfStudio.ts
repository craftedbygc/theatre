import logger from '@unseenco/theatre-shared/logger'
import type {StudioPersistentState} from '@unseenco/theatre-studio/store'
import {studioActions} from '@unseenco/theatre-studio/store'
import type {FullStudioState} from '@unseenco/theatre-studio/store/index'
import debounce from 'lodash-es/debounce'
import type {Store} from 'redux'
import {
  getLegacyStorageKey,
  getProjectStorageKey,
  getStudioStorageKey,
  mergePersistentState,
  splitPersistentState,
  type ProjectOnlyPersistentState,
  type StudioOnlyPersistentState,
} from './splitPersistentState'

type LastPersistedSplit = {
  studio: StudioOnlyPersistentState
  project: ProjectOnlyPersistentState
}

const lastStateByStore = new WeakMap<
  Store<FullStudioState>,
  LastPersistedSplit
>()

export const persistStateOfStudio = (
  reduxStore: Store<FullStudioState>,
  onInitialize: () => void,
  localStoragePrefix: string,
) => {
  const loadState = (s: StudioPersistentState) => {
    reduxStore.dispatch(studioActions.replacePersistentState(s))
  }

  const studioStorageKey = getStudioStorageKey(localStoragePrefix)
  const projectStorageKey = getProjectStorageKey(localStoragePrefix)
  const legacyStorageKey = getLegacyStorageKey(localStoragePrefix)
  const getState = () => reduxStore.getState().$persistent

  loadFromPersistentStorage()

  const persist = () => {
    const newState = getState()
    const {studio, project} = splitPersistentState(newState)
    const lastState = lastStateByStore.get(reduxStore)
    if (
      lastState &&
      lastState.studio === studio &&
      lastState.project === project
    ) {
      return
    }
    lastStateByStore.set(reduxStore, {studio, project})
    localStorage.setItem(studioStorageKey, JSON.stringify(studio))
    localStorage.setItem(projectStorageKey, JSON.stringify(project))
  }
  reduxStore.subscribe(debounce(persist, 1000))
  if (window) {
    window.addEventListener('beforeunload', persist)
  }

  function loadFromPersistentStorage() {
    try {
      const studioState = loadJsonFromStorage<StudioOnlyPersistentState>(
        studioStorageKey,
      )
      const projectState = loadJsonFromStorage<ProjectOnlyPersistentState>(
        projectStorageKey,
      )

      if (studioState || projectState) {
        const merged = mergePersistentState(studioState, projectState)
        if (merged) {
          loadState(merged)
        }
      } else {
        const legacyState = loadJsonFromStorage<StudioPersistentState>(
          legacyStorageKey,
        )
        if (legacyState) {
          loadState(legacyState)
          const {studio, project} = splitPersistentState(legacyState)
          localStorage.setItem(studioStorageKey, JSON.stringify(studio))
          localStorage.setItem(projectStorageKey, JSON.stringify(project))
          localStorage.removeItem(legacyStorageKey)
        }
      }
    } finally {
      onInitialize()
    }
  }
}

function loadJsonFromStorage<T>(storageKey: string): T | null {
  const persistedS = localStorage.getItem(storageKey)
  if (!persistedS) return null

  try {
    return JSON.parse(persistedS) as T
  } catch (e) {
    logger.warn(
      `Could not parse Theatre's persisted state at "${storageKey}". This must be a bug. Please report it.`,
    )
    return null
  }
}

export const __experimental_clearPersistentStorage = (
  reduxStore: Store<FullStudioState>,
  localStoragePrefix: string,
) => {
  __experimental_clearStudioPersistentStorage(reduxStore, localStoragePrefix)
  __experimental_clearProjectPersistentStorage(reduxStore, localStoragePrefix)
}

export const __experimental_clearStudioPersistentStorage = (
  reduxStore: Store<FullStudioState>,
  localStoragePrefix: string,
) => {
  const storageKey = getStudioStorageKey(localStoragePrefix)
  const currentState = reduxStore.getState().$persistent
  const {studio, project} = splitPersistentState(currentState)
  localStorage.removeItem(storageKey)
  localStorage.removeItem(getLegacyStorageKey(localStoragePrefix))
  lastStateByStore.set(reduxStore, {studio, project})
}

export const __experimental_clearProjectPersistentStorage = (
  reduxStore: Store<FullStudioState>,
  localStoragePrefix: string,
) => {
  const storageKey = getProjectStorageKey(localStoragePrefix)
  const currentState = reduxStore.getState().$persistent
  const {studio, project} = splitPersistentState(currentState)
  localStorage.removeItem(storageKey)
  localStorage.removeItem(getLegacyStorageKey(localStoragePrefix))
  lastStateByStore.set(reduxStore, {studio, project})
}
