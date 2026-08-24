# Theatre.js changelog

## 0.1.16

- Bug fixes
  - Core / Studio:
    - Published TypeScript declarations now include the public API (`types`, `getProject`, `createRafDriver`, `setCoreRafDriver`, `IRafDriver`, and other core exports). Windows builds previously treated local `.d.ts` paths as externals, so npm shipped a stub `index.d.ts` that re-exported files that are not in the package.


## 0.1.15

- New features
  - Three.js Package:
    - Multi-scene setups now hide sheets that only have registered objects in inactive scenes from the Studio outline (re-runs on scene switch and object registry changes).
- Bug fixes
  - Three.js Package:
    - Selecting an empty `Object3D` in orbit mode now shows a minimum-size yellow `BoxHelper` (previously invisible because the object has no dimensions).


## 0.1.14

- Bug fixes
  - Three.js Package:
    - Texture / image props from `autoAddObject` / `autoAddMaterial` only reload when the image asset id actually changes, so editing other material props no longer re-fetches (and 404s) the existing map.
    - Preloaded textures now register their original image URL as the Theatre image prop default; `getAssetUrl` passes direct URLs through so the details-pane preview loads the real texture instead of a basename under the asset `baseUrl`.


## 0.1.13

- Bug fixes
  - Three.js Package:
    - `autoAddObject` / `autoAddMaterial` no longer throw when shader number uniforms omit a `gui` options object (`opts.range` was being passed as `undefined` into `types.number()`).


## 0.1.12

- New features
  - Three.js Package:
    - `buildExtension()` now exposes `switchScene(nameOrIndex)` and `getActiveSceneName()` so apps can drive scene changes outside the toolbar flyout (same persist / side effects / `onSceneSwitch` path as the flyout).



## 0.1.11

- New features
  - **`showPropsOf`** — embed another sheet object's props in an object's Studio details pane (UI-only; edits and sequencing still target the source object).
    - `sheet.object(key, props, { showPropsOf: [other] })` or retroactive `object.showPropsOf([other])` / `object.getShowPropsOf()`
    - Linked props render in fieldset sections titled with the source object key
    - Playground demo: [`packages/playground/src/shared/show-props-of`](./packages/playground/src/shared/show-props-of) (`/shared/show-props-of/`)
  - **`object.reconfigure(config, opts?)`** — replace an object's prop config after creation; historic statics/tracks for removed props are stripped
  - Three.js Package:
    - `autoAddMaterial()` — register a Three.js `Material` on a sheet (material props only; no transforms / selection registry)
    - **Shared-material auto-split** — when a second `autoAddObject` uses the same `Material` instance, material props are moved to a dedicated object under `Shared Materials / <name>`, both meshes link via `showPropsOf`, and the first mesh stops applying material locally. Unnamed materials warn and fall back to a UUID-based key; pass `trackMaterial: false` to opt out, or call `autoAddMaterial` first to own the material object
    - Devtools playground: InstancedMesh sphere grid and shared-material meshes exercising auto-split (`/shared/three-basic-vanilla-devtools/`)



## 0.1.10

- New features
  - **List / unload sheets and objects** — runtime APIs to enumerate and tear down loaded sheets/objects without clearing persisted project state. Re-calling `project.sheet()` / `sheet.object()` recreates instances that pick up existing overrides and sequence data.
    - `project.getSheets()` / `sheet.getObjects()` — list currently loaded instances
    - `sheet.unload()` — detach all objects, pause sequences, remove the sheet instance
    - `project.unloadSheet(sheetId, instanceId?)` — unload one sheet (all instances if `instanceId` is omitted)
    - `project.unloadSheets()` — unload every loaded sheet
    - Existing `sheet.detachObject(key)` remains for per-object detach after listing
  - Playground demo: [`packages/playground/src/shared/unload-sheets`](./packages/playground/src/shared/unload-sheets) (`/shared/unload-sheets/`)
- Bug fixes
  - Three.js Package:
    - Fixed orbit-mode selection sync when using the split runtime / `/extension` entries: `autoAddObject` and `buildExtension` again share the same Object3D ↔ sheet-object registry (outline BoxHelper and viewport click-to-select).



## 0.1.9

- New features
  - Three.js Package:
    - `buildExtension()` accepts optional `onSceneSwitch` / `onOrbitModeSwitch` config callbacks, registered before persisted state restore so apps can react to the load-time orbit/scene value. Returned `onSceneSwitch()` / `onOrbitModeSwitch()` methods still support late subscribers for subsequent changes.
- Bug fixes
  - Three.js Package:
    - `dispose()` now detaches extension sheet objects from the Studio project so they do not linger after teardown.



## 0.1.8

- Bug fixes
  - Three.js Package:
    - Importing runtime helpers (`autoAddObject`, `autoAddCamera`, `configureTheatreThreejs`, …) from `@unseenco/theatre-threejs` no longer loads `@unseenco/theatre-studio`. `buildExtension()` moved to `@unseenco/theatre-threejs/extension` (breaking for anyone importing it from the package root). Studio is now an optional peer dependency.



## 0.1.7

- New features
  - Three.js Package:
    - `buildExtension()` now exposes `isOrbitMode()` and `onOrbitModeSwitch(callback)` so apps can react when the orbit/scene camera toggle changes.
- Bug fixes
  - Three.js Package:
    - `autoAddObject()` no longer clears existing procedural textures (e.g. `DataTexture`) when Theatre has no image asset for a texture slot.



## 0.1.6

- New features
  - Three.js Package:
    - `buildExtension()` orbit camera now copies `near` / `far` from the active scene camera and supports syncing from an `OrthographicCamera` as well as a `PerspectiveCamera`.
- Maintenance
  - Published packages now ship dual CJS + ESM builds with `exports` maps (`@unseenco/theatre-core`, `@unseenco/theatre-studio`, `@unseenco/theatre-dataverse`, `@unseenco/theatre-react`, `@unseenco/theatre-threejs`). This lets Vite/Nuxt resolve the ESM entry and share peer dependencies such as `three` instead of nesting a second copy during CJS prebundling.



## 0.1.5

- Bug fixes
  - Fixed `@unseenco/theatre-threejs` importing remote-editor helpers from an unpublished `@unseenco/theatre-studio/remoteEditor` subpath; it now imports from `@unseenco/theatre-studio`.



## 0.1.4

- New features
  - **Static and transient props** — `sheet.object()` accepts `static` and `transient` prop path options. Static props are saved in project state but cannot be keyframed; transient props are session-only and excluded from exported state JSON. The Studio detail panel shows indicators for both.
  - Three.js Package:
    - `configureTheatreThreejs()` — set project-wide defaults for `autoAddObject` exclude/include options (merged with per-call options).
    - `autoAddObject()` — register Three.js `Object3D` instances on a Theatre sheet with auto-parsed transform, material, shader uniform, and texture props. Texture slots and shader uniform textures are transient image props (session-only). Shader uniforms support optional `gui` metadata (`min`/`max`/`step`, `type: 'texture'`).
    - `autoAddCamera()` — register a Three.js `Camera` with transform and camera props (focal length, near, far, zoom); includes a viewport selection hitbox for orbit-mode picking.
    - **Three.js orbit-mode tools** — camera frustum helper, line overlays for scene lines and `userData` curves, and interactive transform controls (gizmo edits write back to the sheet as undoable scrubs). Toolbar toggles persist per scene.
    - **Bidirectional selection sync** — when `autoAddObject()` and `buildExtension()` are used together, clicking a registered mesh in the viewport selects it in the outline; outline selection shows a `BoxHelper` in orbit mode.
- Bug fixes
  - Improved `DefaultValueIndicator` color transparency in the Studio detail panel.



## 0.1.3

- New features
  - **Docked mode** — dock the Studio UI to the edges of the screen so the viewport remains uncovered.
  - `@unseenco/theatre-threejs` — new Studio extension package for Three.js scenes: orbit/scene camera toggle, multi-scene toolbar flyout with per-scene persisted devtools state, and remote-editor isolation (main window stays on scene camera while the popup edits in orbit mode). See the [package README](./packages/threejs/README.md).
  - **Outline visibility API** — `visible: false` on `project.sheet()` and `sheet.object()` keeps extension internals out of the Studio outline.
  - **Studio UI polish** — chordial tooltips and context menus; improved editor popovers; switch toolbar selected state matches pin button styling.
  - Sequence variant folders are hidden in the Studio project outline (sheets list) to reduce clutter.
- Bug fixes
  - Fixed collapsible sections in the vector prop editor.



## 0.1.2

- Maintenance
  - Release CLI publishing refactored to use Yarn.



## 0.1.1

- Maintenance
  - Repository URLs updated in package manifests for the Unseen Studio fork.
  - Enhanced CLI functionality for npm publishing.



## 0.1.0

Initial release of the [Unseen Studio fork](https://github.com/craftedbygc/theatre). Packages are published under the `@unseenco` npm scope.

- New features
  - **Sheet variants** — sheets can declare multiple sheet variants (e.g. `default`, `mobile`, `desktop`) via `sheet.declareSequenceVariants()`. Each variant has independent sequence data, so the same properties can be animated differently per variant without duplicating sheets. Runtime: `sheet.setActiveSequenceVariant()` switches which variant drives prop values; `onValuesChange` now receives a second argument `{variant}`. Studio: variant folders in the outline panel, per-variant static props, opt-in variant objects via context menu.
  - **Built-in remote editor sync** — cross-window editing is baked into `@unseenco/theatre-core` with no opt-in API. When a remote editor window is open (`#editor` in the URL hash), sheet object values, selection, and sequence position mirror automatically over `BroadcastChannel`. Studio adds an "Open remote editor window" button to the global toolbar; the main window's Studio UI hides while the remote editor is open and restores when it closes. Project state is pushed to other windows on disconnect.
  - **Custom core RAF driver** — exported `setCoreRafDriver()` so the core ticker can be driven from an external animation loop.
  - **Collapsed outline folders** — `sheet.declareOutlineNamespace(path, {collapsed})` declares a folder ahead of time (even when empty) and sets its default collapsed state; `sheet.setOutlineNamespaceCollapsed(path, collapsed)` forces a folder collapsed/expanded on load.
  - **Resizable details panel** — the detail panel can be resized by dragging its edge.
  - **Toggle timeline** — a toolbar button pins/unpins the sequence editor (timeline) panel.
  - **Non-undoable transactions** — `studio.transaction(fn, {undoable: false})` persists changes without recording them in undo history.
- Breaking changes
  - Package scope renamed from `@theatre/*` to `@unseenco/theatre-*` (e.g. `@unseenco/theatre-core`, `@unseenco/theatre-studio`).
  - Removed `@theatre/r3f`, `@theatre/remote`, `@theatre/theatric`, and the `benchmarks` workspace package.
  - Removed Studio update-checking UI and logic.



## Previous Theatre Versions



## 0.4.5

- New features
  - `sequence.attachAudio()` now uses an internal `[GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)` that you can customize by connecting it to your own audio graph. Docs [here](https://docs.theatrejs.com/in-depth/#sound-and-music).



## 0.4.4

- New features
  - Implemented [@unseenco/theatre-browser-bundles](https://www.npmjs.com/package/@unseenco/theatre-browser-bundles), a custom build of Theatre.js that can be used via a `<script>` tag and a CDN. This should enable Theatre.js to be used in CodePen or projects that don't use a bundler.



## 0.4.3

- New features
  - `sequence.attachAudio()` now [accepts](https://github.com/craftedbygc/theatre/commit/3f0556b9eb66a0893b43e38a3ee889e13d3a6667) any `AudioNode` as destination.
  - Implemented `studio.createContentOfSaveFile()` for programmatically exporting the project's state.



## 0.4.2

- New features
  - `sequence.attachAudio` now handles autoplay blocking ([Docs](https://docs.theatrejs.com/in-depth/#sequence-attachaudio)).
  - `studio.selection` and co have a more [lax](https://github.com/craftedbygc/theatre/commit/dcf90983a565e585661b631b457a807eb4a4d874) type constraint.
- Bug fixes
  - Fixed the builds of internal examples.



## 0.4.1

- Bug fixes
  - [Fixed](https://github.com/craftedbygc/theatre/commit/fe4010c2c64626029a26e29b9ad9104df9c56ad4) the jumping issue with `sequence.play({range})`.
  - [Fixed](https://github.com/craftedbygc/theatre/commit/769eefb5e521c8206152b0e23937d5a3cd872b8b) a typo in the `dependencies` field, thanks [Nikhil Saraf](https://github.com/nksaraf)!

