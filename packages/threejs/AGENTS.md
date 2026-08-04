# AGENTS.md — `@unseenco/theatre-threejs`

Agent-facing notes for developing this package. See the repo root `AGENTS.md` for monorepo-wide toolchain and CI.

## What this package is

A **Studio extension** (dev-time only, AGPL-3.0) that adds Three.js scene inspection tools. It also exports `autoAddObject()`, a runtime helper that binds Three.js objects to Theatre sheets. Consumers still use `@unseenco/theatre-core` for animation; `autoAddObject` automates the manual `sheet.object()` + `onValuesChange` wiring.

The main entry points are:

- `buildExtension()` — Studio devtools (cameras, orbit controls, selection sync)
- `autoAddObject()` — register a Three.js `Object3D` on a Theatre sheet with auto-parsed transforms and material props

`buildExtension()` returns:

- `extension` — pass to `studio.extend()`
- `getCamera()` — active camera for `renderer.render(scene, camera)` (active scene camera or internal OrbitControls camera)
- `onSceneSwitch(callback)` — subscribe to scene changes from the toolbar flyout; callback receives `(name, scene)` with the original `Scene` reference from init
- `update()` — call each frame when orbit mode is active
- `dispose()` — tear down listeners and controls

`three`, `@unseenco/theatre-core`, and `@unseenco/theatre-studio` are **peer dependencies**. The bundle marks them external in `devEnv/build.ts`.

## Source layout

| File | Role |
| --- | --- |
| `src/buildExtension.ts` | Core logic: cameras, OrbitControls, toolbar, remote-editor behaviour, selection sync |
| `src/autoAddObject.ts` | Register Three.js objects on Theatre sheets |
| `src/buildTransformProps.ts` | Transform prop config + applier |
| `src/buildMaterialProps.ts` | Material prop introspection + applier |
| `src/textureUtils.ts` | Texture slot detection, settings copy, async loading |
| `src/objectRegistry.ts` | Object3D ↔ ISheetObject registry |
| `src/selectionSync.ts` | Bidirectional outline ↔ orbit selection via BoxHelper + raycasting |
| `src/config.ts` | Project-wide `configureTheatreThreejs()` defaults |
| `src/colorUtils.ts` | Linear ↔ sRGB color conversion for Theatre rgba props |
| `src/persistence.ts` | Studio sheet object for persisted devtools state |
| `src/constants.ts` | `EXTENSION_ID`, `DEVTOOLS_SHEET_ID`, registry flags |
| `src/types.ts` | Local `TheatreExtension` / toolbar types (avoids pulling full Studio types at build time) |
| `src/icons.ts` | SVG strings for toolbar Switch options |
| `src/index.ts` | Public exports |

## Commands (from repo root unless noted)

| Task | Command |
| --- | --- |
| Build this package only | `yarn workspace @unseenco/theatre-threejs run build` |
| Typecheck (via tsc project) | `yarn workspace @unseenco/theatre-threejs run typecheck` |
| Full monorepo typecheck | `yarn typecheck` |
| Manual test in browser | `yarn playground` → open `/shared/three-basic-vanilla-devtools/` |

The playground demo lives at `packages/playground/src/shared/three-basic-vanilla-devtools/`. Vite resolves `@unseenco/theatre-threejs` to source via `tsconfig.base.json` — no separate build step needed for playground dev.

## Integration pattern

```js
import studio from '@unseenco/theatre-studio'
import {buildExtension} from '@unseenco/theatre-threejs'

let activeScene = scene

const devtools = buildExtension({
  renderer,
  scenes: [{scene, camera: sceneCamera}],
  studio,
})
devtools.onSceneSwitch((_name, scene) => {
  activeScene = scene
})
studio.extend(devtools.extension)

function loop() {
  requestAnimationFrame(loop)
  devtools.update()
  renderer.render(activeScene, devtools.getCamera())
}
```

`buildExtension` needs the **renderer** and at least one **scene/camera pair** from the user's app. Scene switching in the render loop is user-driven via `onSceneSwitch` — the extension does not call `renderer.render()` itself. It cannot discover scenes automatically because `studio.extend()` only accepts a static extension config object.

## configureTheatreThreejs

Call once at project startup to set project-wide defaults for `autoAddObject`. Per-call options are merged on top (excludes accumulate; includes accumulate).

```js
import {autoAddObject, configureTheatreThreejs} from '@unseenco/theatre-threejs'

configureTheatreThreejs({
  autoAddObject: {
    exclude: {
      uniforms: ['uTime'],       // skip specific shader uniforms
      material: ['map'],         // skip material props
      transform: ['visible'],    // skip transform keys
    },
    // or a flat list applies to all three categories:
    // exclude: ['uTime'],
  },
})
```

Returns `{ reset() }` to restore the previous config (useful in tests).

## autoAddObject

Register a Three.js object on a Theatre sheet with auto-parsed transforms and material properties:

```js
import {autoAddObject, buildExtension} from '@unseenco/theatre-threejs'

const sheetObject = autoAddObject(mesh, sheet, {
  objectKey: 'My Mesh',   // default: mesh.name || 'Object'
  namespace: '',           // optional prefix for objectKey
  exclude: {uniforms: ['uNoise']}, // merged with configureTheatreThreejs defaults
  include: [],             // whitelist material props/uniforms
  trackMaterial: true,     // default: true when mesh has material
})
```

`autoAddObject` calls `sheet.object()` without `reconfigure` — same `objectKey` returns the existing instance per Theatre's normal rules. It registers the Object3D in an internal registry used by `buildExtension` for bidirectional selection.

### Texture props

Material texture slots (`map`, `normalMap`, etc.) and shader uniform textures are registered as Theatre `types.image` props with `persist: false`, so assignments apply for the current session only and are cleared on refresh. They are also marked **transient** (excluded from exported project state JSON).

## Selection sync

When both `autoAddObject` and `buildExtension` are used:

- **Outline → viewport**: selecting a Theatre object shows a `BoxHelper` on the matching Three.js object
- **Viewport → outline** (orbit mode only): click a registered object to select it in the outline (uses raycasting; ignores OrbitControls drags via a 3px movement threshold)

Selection state is ephemeral — not persisted to sheets.

## Persistence

Devtools state is stored on a **Studio project sheet** (`studio.getStudioProject().sheet('Extension: theatre-threejs')`), one object per scene (`Devtools: <scene name>`):

- `orbitEnabled` — scene vs orbit camera
- `position` / `target` — orbit camera pose

A shared object `Devtools: ActiveScene` stores `activeSceneName` so scene switches sync between the main window and the remote editor popup. Each scene keeps its own orbit/camera devtools state.

Rules:

- Use **non-undoable** transactions (`{undoable: false}`) so devtools state does not pollute undo history.
- Subscribe via `stateObj.onValuesChange()` — project state loads asynchronously; do not read values synchronously on init.
- Persist camera position/target on OrbitControls **`end`** event, not on `change` (avoids debounced stale saves and camera jumps).
- Persist each scalar with individual `set()` calls (`set(props.position.x, value)`), not a single object `set(props, {...})` — batched object sets cause partial `onValuesChange` callbacks and camera snapping.

`theatre/core/src/projects/initialiseProjectState.ts` uses `??=` when initialising ahistoric state so extension sheet data is not wiped on project attach.

## Remote editor behaviour

The package depends on Studio remote-editor APIs in `theatre/studio/src/remoteEditor.ts`:

- `isRemoteEditorOpen()` — main window has a remote editor popup open
- `onRemoteEditorOpenChange(listener)` — subscribe to open/close
- `isRemoteEditorWindow()` from `@unseenco/theatre-core` — current window is the `#editor` popup

Intended behaviour (do not regress):

| Window | Behaviour |
| --- | --- |
| **Main** | Normal persist + apply. When remote opens: save current mode, switch to **scene camera** locally (not persisted). When remote closes: restore saved mode via `setOrbitMode()` (with persist). Ignore `onValuesChange` while remote is open or until close handler finishes (`modeBeforeRemoteEditor` guard). |
| **Remote** | Always opens in **orbit** mode. Applies position/target from sheet until user toggles locally. Does **not** persist toggles or camera drags — keeps main window state independent. |

Studio UI visibility: the main window calls `studio.ui.hide()` when opening remote; persisted visibility must not hide Studio in the remote window (see `theatre/studio/src/Studio.ts` and `UIRoot.tsx`).

## Toolbar

The extension registers a global toolbar **Flyout** (when multiple scenes are configured) for scene switching and a **Switch** for scene/orbit camera. Switch `value` must stay in sync with local `mode`.

## Build / lint quirks

- Follow `packages/react` for package scaffolding: `devEnv/build.ts`, api-extractor, `tsconfig.json` with `composite: true`.
- `devEnv/build.ts` must be covered by `devEnv/tsconfig.json` or ESLint pre-commit fails.
- `@unseenco/theatre-studio` must not import `@unseenco/theatre-core` value exports (lint rule) — remote-editor helpers live in `theatre/studio/src/remoteEditor.ts` with a local `isRemoteEditorWindow()` duplicate.
- This package **may** import `isRemoteEditorWindow` from `@unseenco/theatre-core` and remote-editor helpers (`isRemoteEditorOpen`, `onRemoteEditorOpenChange`) from `@unseenco/theatre-studio`.
- OrbitControls import path: `three/examples/jsm/controls/OrbitControls.js` (not `three/addons/...`).
- Register the package in root `devEnv/cli.ts`, `tsconfig.base.json`, and `devEnv/typecheck-all-projects/tsconfig.all.json` when adding new surface area.

## Monorepo touchpoints outside this folder

- `theatre/studio/src/remoteEditor.ts` — remote editor open/close tracking (extracted from `GlobalToolbar.tsx`)
- `theatre/core/src/coreExports.ts` — exports `isRemoteEditorWindow`
- `theatre/studio/src/index.ts` — exports `isRemoteEditorOpen`, `onRemoteEditorOpenChange`
- `packages/playground/package.json` — workspace devDependency for the demo

## When extending

Future features (helpers, grid, etc.) should follow the same patterns:

1. Keep runtime state in the user's Three.js scene; use Studio sheets only for **devtools UI state** that should persist.
2. Respect main vs remote editor isolation — remote is for editing Theatre objects; the main window keeps rendering the scene.
3. Add toolbar tools via the `toolbars` extension API; keep types in `src/types.ts` if Studio types are awkward to import.
4. Test manually via the playground demo and remote editor flow (open popup, toggle cameras, drag orbit, close, refresh). Test `autoAddObject` selection by toggling orbit mode and clicking meshes.
