# Theatre.js changelog

## 0.1.0

Initial release of the [Unseen Studio fork](https://github.com/craftedbygc/theatre). Packages are published under the `@unseenco` npm scope.

* New features
  * **Sheet sequence variants** — sheets can declare multiple sequence variants (e.g. `default`, `mobile`, `desktop`) via `sheet.declareSequenceVariants()`. Each variant has independent sequence data, so the same properties can be animated differently per variant without duplicating sheets. Runtime: `sheet.setActiveSequenceVariant()` switches which variant drives prop values; `onValuesChange` now receives a second argument `{variant}`. Studio: variant folders in the outline panel, per-variant static props, opt-in variant objects via context menu.
  * **Built-in remote editor sync** — cross-window editing is baked into `@unseenco/theatre-core` with no opt-in API. When a remote editor window is open (`#editor` in the URL hash), sheet object values, selection, and sequence position mirror automatically over `BroadcastChannel`. Studio adds an "Open remote editor window" button to the global toolbar; the main window's Studio UI hides while the remote editor is open and restores when it closes. Project state is pushed to other windows on disconnect.
  * **Custom core RAF driver** — exported `setCoreRafDriver()` so the core ticker can be driven from an external animation loop.
  * **Collapsed outline folders** — `sheet.declareOutlineNamespace(path, {collapsed})` declares a folder ahead of time (even when empty) and sets its default collapsed state; `sheet.setOutlineNamespaceCollapsed(path, collapsed)` forces a folder collapsed/expanded on load.
  * **Resizable details panel** — the detail panel can be resized by dragging its edge.
  * **Toggle timeline** — a toolbar button pins/unpins the sequence editor (timeline) panel.
  * **Non-undoable transactions** — `studio.transaction(fn, {undoable: false})` persists changes without recording them in undo history.

* Breaking changes
  * Package scope renamed from `@theatre/*` to `@unseenco/theatre-*` (e.g. `@unseenco/theatre-core`, `@unseenco/theatre-studio`).
  * Removed `@theatre/r3f`, `@theatre/remote`, `@theatre/theatric`, and the `benchmarks` workspace package.
  * Removed Studio update-checking UI and logic.



## Previous Theatre Versions

## 0.4.5

* New features
  * `sequence.attachAudio()` now uses an internal [`GainNode`](https://developer.mozilla.org/en-US/docs/Web/API/GainNode) that you can customize by connecting it to your own audio graph. Docs [here](https://docs.theatrejs.com/in-depth/#sound-and-music).

## 0.4.4

* New features
  * Implemented [@unseenco/theatre-browser-bundles](https://www.npmjs.com/package/@unseenco/theatre-browser-bundles), a custom build of Theatre.js that can be used via a `<script>` tag and a CDN. This should enable Theatre.js to be used in CodePen or projects that don't use a bundler.

## 0.4.3

* New features
  * `sequence.attachAudio()` now [accepts](https://github.com/craftedbygc/theatre/commit/3f0556b9eb66a0893b43e38a3ee889e13d3a6667) any `AudioNode` as destination.
  * Implemented `studio.createContentOfSaveFile()` for programmatically exporting the project's state.

## 0.4.2

* New features
  * `sequence.attachAudio` now handles autoplay blocking ([Docs](https://docs.theatrejs.com/in-depth/#sequence-attachaudio)).
  * `studio.selection` and co have a more [lax](https://github.com/craftedbygc/theatre/commit/dcf90983a565e585661b631b457a807eb4a4d874) type constraint.
* Bug fixes
  * Fixed the builds of internal examples.

## 0.4.1

* Bug fixes
  * [Fixed](https://github.com/craftedbygc/theatre/commit/fe4010c2c64626029a26e29b9ad9104df9c56ad4) the jumping issue with `sequence.play({range})`.
  * [Fixed](https://github.com/craftedbygc/theatre/commit/769eefb5e521c8206152b0e23937d5a3cd872b8b) a typo in the `dependencies` field, thanks [Nikhil Saraf](https://github.com/nksaraf)!