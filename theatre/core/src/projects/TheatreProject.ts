import {privateAPI, setPrivateAPI} from '@unseenco/theatre-core/privateAPIs'
import Project from '@unseenco/theatre-core/projects/Project'
import type {ISheet} from '@unseenco/theatre-core/sheets/TheatreSheet'

import type {ProjectAddress} from '@unseenco/theatre-shared/utils/addresses'
import type {Asset, File} from '@unseenco/theatre-shared/utils/assets'
import type {
  ProjectId,
  SheetId,
  SheetInstanceId,
} from '@unseenco/theatre-shared/utils/ids'
import {validateInstanceId} from '@unseenco/theatre-shared/utils/sanitizers'
import {validateAndSanitiseSlashedPathOrThrow} from '@unseenco/theatre-shared/utils/slashedPaths'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'
import {notify} from '@unseenco/theatre-shared/notify'

/**
 * A project's config object (currently the only point of configuration is the project's state)
 */
export type ISheetOptions = {
  /**
   * Whether the sheet appears in the Studio outline panel. Defaults to `true`.
   */
  visible?: boolean
}

export type IProjectConfig = {
  /**
   * The state of the project, as [exported](https://www.theatrejs.com/docs/latest/manual/projects#state) by the studio.
   */
  state?: $IntentionalAny
  assets?: {
    baseUrl?: string
  }
}

// export type IProjectConfigExperiments = {
//   /**
//    * Defaults to using global `console` with style args.
//    *
//    * (TODO: check for browser environment before using style args)
//    */
//   logger?: ITheatreLoggerConfig
//   /**
//    * Defaults:
//    *  * `production` builds: console - error
//    *  * `development` builds: console - error, warning
//    */
//   logging?: ITheatreLoggingConfig
// }

/**
 * A Theatre.js project
 */
export interface IProject {
  readonly type: 'Theatre_Project_PublicAPI'
  /**
   * If `@unseenco/theatre-studio` is used, this promise would resolve when studio has loaded
   * the state of the project into memory.
   *
   * If `@unseenco/theatre-studio` is not used, this promise is already resolved.
   */
  readonly ready: Promise<void>
  /**
   * Shows whether the project is ready to be used.
   * Better to use {@link IProject.ready}, which is a promise that would
   * resolve when the project is ready.
   */
  readonly isReady: boolean
  /**
   * The project's address
   */
  readonly address: ProjectAddress

  /**
   * Creates a Sheet under the project
   * @param sheetId - Sheets are identified by their `sheetId`, which must be a string longer than 3 characters
   * @param instanceIdOrOpts - Optionally provide an `instanceId` if you want to create multiple instances of the same Sheet, or pass `{ visible: false }` to hide the sheet from the Studio outline panel
   * @param opts - Optionally provide `{ visible: false }` to hide the sheet from the Studio outline panel
   * @returns The newly created Sheet
   *
   * **Docs: https://www.theatrejs.com/docs/latest/manual/sheets**
   */
  sheet(sheetId: string, instanceIdOrOpts?: string | ISheetOptions): ISheet
  sheet(sheetId: string, instanceId: string, opts?: ISheetOptions): ISheet

  /**
   * Returns all currently loaded sheet instances under this project.
   *
   * Use with {@link ISheet.detachObject} or {@link ISheet.unload} to tear down
   * individual sheets/objects at runtime. Persisted project state is not cleared.
   */
  getSheets(): ISheet[]

  /**
   * Unloads one sheet and its attached objects from memory.
   *
   * Runtime-only: persisted prop overrides and sequence data are kept. Calling
   * {@link IProject.sheet} again with the same `sheetId` recreates the sheet.
   *
   * @param sheetId - The sheet id previously given to {@link IProject.sheet}
   * @param instanceId - If provided, only that instance is unloaded. If omitted,
   *   all loaded instances of `sheetId` are unloaded.
   */
  unloadSheet(sheetId: string, instanceId?: string): void

  /**
   * Unloads every currently loaded sheet and its objects from memory.
   *
   * Runtime-only: persisted project state is kept.
   */
  unloadSheets(): void

  /**
   * Returns the URL for an asset.
   *
   * @param asset - The asset to get the URL for
   * @returns The URL for the asset, or `undefined` if the asset is not found
   */
  getAssetUrl(asset: Asset | File): string | undefined
}

export default class TheatreProject implements IProject {
  get type(): 'Theatre_Project_PublicAPI' {
    return 'Theatre_Project_PublicAPI'
  }
  /**
   * @internal
   */
  constructor(id: string, config: IProjectConfig = {}) {
    setPrivateAPI(this, new Project(id as ProjectId, config, this))
  }

  get ready(): Promise<void> {
    return privateAPI(this).ready
  }

  get isReady(): boolean {
    return privateAPI(this).isReady()
  }

  get address(): ProjectAddress {
    return {...privateAPI(this).address}
  }

  getAssetUrl(asset: Asset): string | undefined {
    // probably should put this in project.getAssetUrl but this will do for now
    if (!this.isReady) {
      console.error(
        'Calling `project.getAssetUrl()` before `project.ready` is resolved, will always return `undefined`. ' +
          'Either use `project.ready.then(() => project.getAssetUrl())` or `await project.ready` before calling `project.getAssetUrl()`.',
      )
      return undefined
    }

    return asset.id
      ? privateAPI(this).assetStorage.getAssetUrl(asset.id)
      : undefined
  }

  sheet(
    sheetId: string,
    instanceIdOrOpts: string | ISheetOptions = 'default',
    opts?: ISheetOptions,
  ): ISheet {
    const sanitizedPath = validateAndSanitiseSlashedPathOrThrow(
      sheetId,
      'project.sheet',
    )

    let instanceId: string = 'default'
    let sheetOpts: ISheetOptions | undefined

    if (typeof instanceIdOrOpts === 'string') {
      instanceId = instanceIdOrOpts
      sheetOpts = opts
    } else {
      sheetOpts = instanceIdOrOpts
    }

    if (process.env.NODE_ENV !== 'production') {
      validateInstanceId(
        instanceId,
        'instanceId in project.sheet(sheetId, instanceId)',
        true,
      )
    }

    return privateAPI(this).getOrCreateSheet(
      sanitizedPath as SheetId,
      instanceId as SheetInstanceId,
      sheetOpts,
    ).publicApi
  }

  getSheets(): ISheet[] {
    return privateAPI(this)
      .getSheets()
      .map((sheet) => sheet.publicApi)
  }

  unloadSheet(sheetId: string, instanceId?: string): void {
    const sanitizedPath = validateAndSanitiseSlashedPathOrThrow(
      sheetId,
      'project.unloadSheet',
    )

    let sanitizedInstanceId: SheetInstanceId | undefined
    if (instanceId !== undefined) {
      if (process.env.NODE_ENV !== 'production') {
        validateInstanceId(
          instanceId,
          'instanceId in project.unloadSheet(sheetId, instanceId)',
          true,
        )
      }
      sanitizedInstanceId = instanceId as SheetInstanceId
    }

    const unloaded = privateAPI(this).unloadSheet(
      sanitizedPath as SheetId,
      sanitizedInstanceId,
    )

    if (!unloaded) {
      const instanceHint =
        instanceId !== undefined ? ` (instance "${instanceId}")` : ''
      notify.warning(
        `Couldn't unload sheet "${sanitizedPath}"${instanceHint}`,
        `There is no loaded sheet with id "${sanitizedPath}"${instanceHint}.

To fix this, make sure you are calling \`project.unloadSheet\` with a sheet that was previously created via \`project.sheet(...)\`.`,
      )
      console.warn(
        `Sheet "${sanitizedPath}"${instanceHint} is not currently loaded.`,
      )
    }
  }

  unloadSheets(): void {
    privateAPI(this).unloadSheets()
  }
}
