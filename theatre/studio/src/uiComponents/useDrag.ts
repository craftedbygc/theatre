import type {$FixMe} from '@unseenco/theatre-shared/utils/types'
import {useLayoutEffect, useRef} from 'react'
import {useCssCursorLock} from './PointerEventsHandler'
import type {CapturedPointer} from '@unseenco/theatre-studio/UIRoot/PointerCapturing'
import {usePointerCapturing} from '@unseenco/theatre-studio/UIRoot/PointerCapturing'
import noop from '@unseenco/theatre-shared/utils/noop'
import {isSafari} from './isSafari'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'

export enum MouseButton {
  Left = 0,
  Middle = 1,
  // Not including Right because it _might_ interfere with chord clicking.
  // So we'll wait for chord-clicking to land before exploring right-button gestures
}

/**
 * dx, dy: delta x/y from the start of the drag
 *
 * Total movement since the start of the drag. This is commonly used with something like "drag keyframe" or "drag handle",
 * where you might be dragging an item around in the UI.
 * @param totalDragDeltaX - x moved total
 * @param totalDragDeltaY - y moved total
 *
 * Movement from the last event / on drag call. This is commonly used with something like "prop nudge".
 * @param dxFromLastEvent - x moved since last event
 * @param dyFromLastEvent - y moved since last event
 */
type OnDragCallback = (
  totalDragDeltaX: number,
  totalDragDeltaY: number,
  event: MouseEvent,
  dxFromLastEvent: number,
  dyFromLastEvent: number,
) => void

type OnClickCallback = (pointerUpEvent: MouseEvent) => void

type OnDragEndCallback = (dragHappened: boolean, event?: MouseEvent) => void

export type DragHandlers = {
  /**
   * Called at the end of the drag gesture.
   * `dragHappened` will be `true` if if the user actually moved the pointer
   * (if onDrag isn't called, then this will be false becuase the user hasn't moved the pointer)
   */
  onDragEnd?: OnDragEndCallback
  onDrag: OnDragCallback
  onClick?: OnClickCallback
}

export type DragOpts = {
  /**
   * Provide a name for the thing wanting to use the drag helper.
   * This can show up in various errors and potential debug logs to help narrow down.
   */
  debugName: string
  /**
   * Setting it to true will disable the listeners.
   */
  disabled?: boolean
  /**
   * Setting it to true will allow the pointer down events to propagate up
   */
  dontBlockMouseDown?: boolean
  /**
   * Tells the browser to take control of the mouse pointer so that
   * the user can drag endlessly in any direction without hitting the
   * side of their screen.
   *
   * Note: that if we detect that the browser is
   * safari then pointer lock is not used because the pointer lock
   * banner annoyingly shifts the entire page down.
   *
   * Pointer lock is only used for mouse pointers, not touch.
   *
   * ref: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
   */
  shouldPointerLock?: boolean
  /**
   * The css cursor property during the gesture will be locked to this value
   */
  lockCSSCursorTo?: string
  /**
   * Called at the start of the gesture. Mind you, that this would be called, even
   * if the user is just clicking (and not dragging). However, if the gesture turns
   * out to be a click, then `onDragEnd(false)` will be called. Otherwise,
   * a series of `onDrag(dx, dy, event)` events will be called, and the
   * gesture will end with `onDragEnd(true)`.
   *
   *
   * @returns
   * onDragStart can be undefined, in which case, we always handle useDrag,
   * but when defined, we can allow the handler to return false to indicate ignore this dragging
   */
  onDragStart: (event: MouseEvent) => false | DragHandlers
  buttons?:
    | [MouseButton]
    | [MouseButton, MouseButton]
    | [MouseButton | MouseButton | MouseButton]
}

/** How far in total does the cursor have to move before we decide that the user is dragging */
export const DRAG_DETECTION_DISTANCE_THRESHOLD = 3
export const DRAG_DETECTION_WAS_POINTER_LOCK_MOVEMENT = 100

type IUseDragStateRef = IUseDragState_NotStarted | IUseDragState_Started

type IUseDragState_NotStarted = {
  /** We have not yet encountered a `"dragstart"` event. */
  domDragStarted: false
}

type IUseDragState_Started = {
  /** We have encountered a `"dragstart"` event. */
  domDragStarted: true
  pointerId: number
  pointerType: string
  detection:
    | IUseDragStateDetection_Detected
    | IUseDragStateDetection_NotDetected
  /**
   * Used when `isPointerLockUsed` is false, so we can calculate
   * dx / dy based on the difference of the moved pointer from the start position of the pointer.
   *
   * This is generally going to give us a much more accurate estimation than accumulating
   * movementX & movementY values.
   */
  startPos: {
    x: number
    y: number
  }
  lastPos: {
    x: number
    y: number
  }
}
type IUseDragStateDetection_NotDetected = {
  detected: false
  // Used for detection thresholds
  /** Accumulated in all directions */
  totalDistanceMoved: number
}

type IUseDragStateDetection_Detected = {
  detected: true
  dragMovement: {
    x: number
    y: number
  }
  /**
   * Number of drag events since we started guessing this was a drag
   * This is used to determine if requesting pointer lock causes a
   * large change to mouse movement (since on at least FF, requesting
   * pointer lock will move the pointer to the center of the screen)
   */
  dragEventCount: number
}

function getPointerCaptureElement(
  target: HTMLElement | SVGElement,
  event: PointerEvent,
): Element {
  if (!(event.target instanceof Element) || !target.contains(event.target)) {
    return target
  }

  // Elements with display:contents don't generate a box, so pointer capture on
  // them is unreliable. Capture on the actual event target instead.
  if (getComputedStyle(target).display === 'contents') {
    return event.target
  }

  return target
}

function getMovementFromEvent(
  event: PointerEvent,
  lastPos: {x: number; y: number},
): {dx: number; dy: number} {
  if (event.movementX !== 0 || event.movementY !== 0) {
    return {dx: event.movementX, dy: event.movementY}
  }

  const dx = event.screenX - lastPos.x
  const dy = event.screenY - lastPos.y
  return {dx, dy}
}

export default function useDrag(
  target: HTMLElement | SVGElement | undefined | null,
  opts: DragOpts,
): [isDragging: boolean] {
  const optsRef = useRef<DragOpts>(opts)
  optsRef.current = opts

  const stateRef = useRef<IUseDragStateRef>({
    domDragStarted: false,
  })

  const {capturePointer} = usePointerCapturing(`useDrag for ${opts.debugName}`)

  const callbacksRef = useRef<{
    onDrag: OnDragCallback
    onDragEnd: OnDragEndCallback
    onClick: OnClickCallback
  }>({onDrag: noop, onDragEnd: noop, onClick: noop})

  const capturedPointerRef = useRef<undefined | CapturedPointer>()
  const pointerCaptureElementRef = useRef<Element | null>(null)
  // needed to have a state on the react lifecycle which can be updated
  // via a ref (e.g. via the below layout effect).
  const [isDraggingRef, isDragging] = useRefAndState(false)
  useLayoutEffect(() => {
    if (!target) return
    const ensureIsDraggingUpToDateForReactLifecycle = () => {
      const isDragging =
        stateRef.current.domDragStarted && stateRef.current.detection.detected
      if (isDraggingRef.current !== isDragging) {
        isDraggingRef.current = isDragging
      }
    }

    const isPointerLockUsedForEvent = (pointerType: string) =>
      optsRef.current.shouldPointerLock &&
      !isSafari &&
      pointerType === 'mouse'

    const dragHandler = (event: PointerEvent) => {
      if (!stateRef.current.domDragStarted) return
      if (event.pointerId !== stateRef.current.pointerId) return

      const stateStarted = stateRef.current

      if (
        didPointerLockCauseMovement(event, stateStarted.detection) &&
        isPointerLockUsedForEvent(stateStarted.pointerType)
      ) {
        return
      }

      const {dx: movementX, dy: movementY} = getMovementFromEvent(
        event,
        stateStarted.lastPos,
      )
      stateStarted.lastPos = {x: event.screenX, y: event.screenY}

      if (!stateStarted.detection.detected) {
        stateStarted.detection.totalDistanceMoved +=
          Math.abs(movementY) + Math.abs(movementX)

        if (
          stateStarted.detection.totalDistanceMoved >
          DRAG_DETECTION_DISTANCE_THRESHOLD
        ) {
          if (isPointerLockUsedForEvent(stateStarted.pointerType)) {
            target.requestPointerLock()
          }

          stateStarted.detection = {
            detected: true,
            dragMovement: {x: 0, y: 0},
            dragEventCount: 0,
          }
          ensureIsDraggingUpToDateForReactLifecycle()
        }
      }

      // drag detection threshold checking
      if (stateStarted.detection.detected) {
        stateStarted.detection.dragEventCount += 1
        const {dragMovement} = stateStarted.detection
        if (isPointerLockUsedForEvent(stateStarted.pointerType)) {
          // when locked, the pointer event screen position is going to be 0s, since the pointer can't move.
          // So, we use the movement on the event
          dragMovement.x += movementX
          dragMovement.y += movementY
        } else {
          const {startPos} = stateStarted
          dragMovement.x = event.screenX - startPos.x
          dragMovement.y = event.screenY - startPos.y
        }

        callbacksRef.current.onDrag(
          dragMovement.x,
          dragMovement.y,
          event,
          movementX,
          movementY,
        )
      }
    }

    const dragEndHandler = (e: PointerEvent) => {
      if (!stateRef.current.domDragStarted) return
      if (e.pointerId !== stateRef.current.pointerId) return

      removeDragListeners()
      const dragHappened = stateRef.current.detection.detected
      const pointerType = stateRef.current.pointerType
      stateRef.current = {domDragStarted: false}

      if (isPointerLockUsedForEvent(pointerType)) document.exitPointerLock()

      callbacksRef.current.onDragEnd(dragHappened, e)

      // ensure that the window is focused after a successful drag
      // this fixes an issue where after dragging something like the playhead
      // through an iframe, you can immediately hit [space] and the animation
      // will play, even if you hadn't been focusing in the iframe at the start
      // of the drag.
      //
      // Fixes https://linear.app/theatre/issue/P-177/beginners-scrubbing-the-playhead-from-within-an-iframe-then-[space]
      window.focus()

      if (!dragHappened) {
        callbacksRef.current.onClick(e)
      }
      ensureIsDraggingUpToDateForReactLifecycle()
    }

    const addDragListeners = () => {
      document.addEventListener('pointermove', dragHandler)
      document.addEventListener('pointerup', dragEndHandler)
      document.addEventListener('pointercancel', dragEndHandler)
    }

    const removeDragListeners = () => {
      capturedPointerRef.current?.release()
      const captureEl = pointerCaptureElementRef.current
      if (captureEl && stateRef.current.domDragStarted) {
        try {
          if (captureEl.hasPointerCapture(stateRef.current.pointerId)) {
            captureEl.releasePointerCapture(stateRef.current.pointerId)
          }
        } catch {
          // pointer may already be released
        }
      }
      pointerCaptureElementRef.current = null
      document.removeEventListener('pointermove', dragHandler)
      document.removeEventListener('pointerup', dragEndHandler)
      document.removeEventListener('pointercancel', dragEndHandler)
    }

    const preventUnwantedClick = (event: MouseEvent) => {
      if (optsRef.current.disabled) return
      if (!stateRef.current.domDragStarted) return
      if (stateRef.current.detection.detected) {
        if (!optsRef.current.dontBlockMouseDown) {
          event.stopPropagation()
          event.preventDefault()
        }
        stateRef.current.detection = {
          detected: false,
          totalDistanceMoved: 0,
        }
        ensureIsDraggingUpToDateForReactLifecycle()
      }
    }

    const dragStartHandler = (event: PointerEvent) => {
      // defensively release
      capturedPointerRef.current?.release()

      const opts = optsRef.current
      if (opts.disabled === true) return

      const acceptedButtons: MouseButton[] = opts.buttons ?? [MouseButton.Left]

      // Touch pointers report button 0 on pointerdown.
      if (
        event.pointerType !== 'touch' &&
        !acceptedButtons.includes(event.button)
      ) {
        return
      }

      const returnOfOnDragStart = opts.onDragStart(event)

      if (returnOfOnDragStart === false) {
        // we should ignore the gesture
        return
      }

      callbacksRef.current.onDrag = returnOfOnDragStart.onDrag
      callbacksRef.current.onDragEnd = returnOfOnDragStart.onDragEnd ?? noop
      callbacksRef.current.onClick = returnOfOnDragStart.onClick ?? noop

      // need to capture pointer after we know the provided handler wants to handle drag start
      capturedPointerRef.current = capturePointer('Drag start')

      if (!opts.dontBlockMouseDown) {
        event.stopPropagation()
        event.preventDefault()
      }

      const captureEl = getPointerCaptureElement(target, event)
      pointerCaptureElementRef.current = captureEl
      try {
        captureEl.setPointerCapture(event.pointerId)
      } catch {
        // setPointerCapture may fail in some edge cases
      }

      if (event.pointerType === 'touch') {
        const touchActionTarget =
          event.target instanceof Element ? event.target : captureEl
        if (
          touchActionTarget instanceof HTMLElement &&
          !touchActionTarget.style.touchAction
        ) {
          touchActionTarget.style.touchAction = 'none'
        }
      }

      stateRef.current = {
        domDragStarted: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startPos: {x: event.screenX, y: event.screenY},
        lastPos: {x: event.screenX, y: event.screenY},
        detection: {
          detected: false,
          totalDistanceMoved: 0,
        },
      }
      ensureIsDraggingUpToDateForReactLifecycle()

      addDragListeners()
    }

    const onPointerDown = (e: PointerEvent) => {
      dragStartHandler(e)
    }

    target.addEventListener('pointerdown', onPointerDown as $FixMe)
    target.addEventListener('click', preventUnwantedClick as $FixMe)

    const previousTouchAction = target.style.touchAction
    if (!previousTouchAction) {
      target.style.touchAction = 'none'
    }

    return () => {
      removeDragListeners()
      target.removeEventListener('pointerdown', onPointerDown as $FixMe)
      target.removeEventListener('click', preventUnwantedClick as $FixMe)

      if (!previousTouchAction) {
        target.style.touchAction = ''
      }

      if (stateRef.current.domDragStarted) {
        callbacksRef.current.onDragEnd?.(stateRef.current.detection.detected)
      }
      stateRef.current = {domDragStarted: false}
      ensureIsDraggingUpToDateForReactLifecycle()
    }
  }, [target])

  useCssCursorLock(
    isDragging && !!opts.lockCSSCursorTo,
    'dragging',
    opts.lockCSSCursorTo,
  )

  return [isDragging]
}

/**
 * shouldPointerLock moves the mouse to the center of your screen in firefox, which
 * can cause it to report very large movementX when the pointer lock begins. This
 * function hackily detects unnaturally large movements of the mouse.
 *
 * @param event - PointerEvent from onDrag
 * @returns
 */
export function didPointerLockCauseMovement(
  event: MouseEvent,
  detection:
    | Pick<IUseDragStateDetection_Detected, 'detected' | 'dragEventCount'>
    | Pick<IUseDragStateDetection_NotDetected, 'detected'>,
) {
  const isEarlyInDragging =
    !detection.detected || (detection.detected && detection.dragEventCount < 3)

  return (
    isEarlyInDragging &&
    // sudden movement
    (Math.abs(event.movementX) > DRAG_DETECTION_WAS_POINTER_LOCK_MOVEMENT ||
      Math.abs(event.movementY) > DRAG_DETECTION_WAS_POINTER_LOCK_MOVEMENT)
  )
}
