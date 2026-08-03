# @unseenco/theatre-threejs

Three.js devtools extension for [Theatre.js Studio](https://www.theatrejs.com/).

## Usage

```js
import studio from '@unseenco/theatre-studio'
import {autoAddObject, buildExtension} from '@unseenco/theatre-threejs'

let activeScene = scene1

// Register Three.js objects on Theatre sheets
autoAddObject(mesh, sheet)

const devtools = buildExtension({
  renderer,
  scenes: [
    {scene: scene1, camera: camera1},
    {name: 'Scene 2', scene: scene2, camera: camera2},
  ],
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

The extension adds a toolbar flyout to switch between scenes (when more than one is configured) and a toggle between your scene camera and an OrbitControls dev camera.

## configureTheatreThreejs

Set project-wide defaults once at startup. Excludes from defaults and per-call `autoAddObject` options are merged.

```js
import {configureTheatreThreejs} from '@unseenco/theatre-threejs'

configureTheatreThreejs({
  autoAddObject: {
    exclude: {uniforms: ['uTime']},
  },
})
```

## autoAddObject

Automatically adds a Three.js `Object3D` to a Theatre sheet, parsing transform data (position, rotation, scale, visible) and material properties (colors, scalars, vectors, shader uniforms). Texture/map properties are not supported yet.

```js
import {autoAddObject} from '@unseenco/theatre-threejs'

const sheetObject = autoAddObject(mesh, sheet, {
  objectKey: 'My Mesh',
  exclude: {transform: ['scale']},
  include: {material: ['color', 'metalness', 'roughness']},
})
```

When used together with `buildExtension`, selection is synced bidirectionally in orbit mode:

- Click a registered mesh in the viewport to select it in the Theatre outline
- Select an object in the outline to show a `BoxHelper` around the matching mesh

## Persistence

Scene names are taken from the optional `name` property, then from `scene.name` on the Three.js `Scene` instance, then default to `"Scene"` (with numeric suffixes when needed).

Devtools state (orbit mode, camera position, and orbit target) is persisted per scene across page refreshes via Studio sheet objects (`Devtools: <scene name>`), using non-undoable transactions so it does not pollute the undo history.
