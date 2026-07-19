import type {Ticker} from '@theatre/dataverse'
import {privateAPI} from './privateAPIs'
import type {IRafDriver, RafDriverPrivateAPI} from './rafDrivers'
import {createRafDriver} from './rafDrivers'

/**
 * Creates a rafDrive that uses `window.requestAnimationFrame` in browsers,
 * or a single `setTimeout` in SSR.
 */
function createBasicRafDriver(): IRafDriver {
  let rafId: number | null = null
  const start = (): void => {
    if (typeof window !== 'undefined') {
      const onAnimationFrame = (t: number) => {
        driver.tick(t)
        rafId = window.requestAnimationFrame(onAnimationFrame)
      }
      rafId = window.requestAnimationFrame(onAnimationFrame)
    } else {
      driver.tick(0)
      setTimeout(() => driver.tick(1), 0)
    }
  }

  const stop = (): void => {
    if (typeof window !== 'undefined') {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    } else {
      // nothing to do in SSR
    }
  }

  const driver = createRafDriver({name: 'DefaultCoreRafDriver', start, stop})

  return driver
}

let coreRafDriver: RafDriverPrivateAPI | undefined

/**
 * Returns the rafDriver that is used by the core internally. Creates a new one if it's not set yet.
 */
export function getCoreRafDriver(): RafDriverPrivateAPI {
  if (!coreRafDriver) {
    setCoreRafDriver(createBasicRafDriver())
  }
  return coreRafDriver!
}

/**
 *
 * @returns The ticker that is used by the core internally.
 */
export function getCoreTicker(): Ticker {
  return getCoreRafDriver().ticker
}

/**
 * Sets the `rafDriver` that Theatre's core uses internally to tick forward.
 *
 * Call this **before** any other `@theatre/core` API that would trigger tick creation
 * (e.g. `onChange`, `sequence.play`, `val`). Calling it after the core ticker has
 * already been initialised will throw.
 *
 * This is the recommended way to drive Theatre from your own
 * `requestAnimationFrame` loop — for example when integrating with
 * `gsap`, `lenis`, or an XR session:
 *
 * ```ts
 * import { createRafDriver, setCoreRafDriver } from '@theatre/core'
 *
 * const driver = createRafDriver({ name: 'MyRafDriver' })
 * setCoreRafDriver(driver)
 *
 * function myLoop(time: number) {
 *   driver.tick(time)
 *   requestAnimationFrame(myLoop)
 * }
 * requestAnimationFrame(myLoop)
 * ```
 *
 * Because you hold the `driver` reference you created, you do not need a separate
 * `getCoreRafDriver()` call — just keep the reference around and call
 * `driver.tick(time)` from your loop.
 */
export function setCoreRafDriver(driver: IRafDriver) {
  if (coreRafDriver) {
    throw new Error(`\`setCoreRafDriver()\` is already called.`)
  }
  const driverPrivateApi = privateAPI(driver)
  coreRafDriver = driverPrivateApi
}
