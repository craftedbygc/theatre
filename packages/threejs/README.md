# @unseenco/theatre-threejs

Three.js devtools extension for [Theatre.js Studio](https://www.theatrejs.com/).

## Usage

```js
import studio from '@unseenco/theatre-studio'
import {buildExtension} from '@unseenco/theatre-threejs'

let activeScene = scene1

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

Scene names are taken from the optional `name` property, then from `scene.name` on the Three.js `Scene` instance, then default to `"Scene"` (with numeric suffixes when needed).

Devtools state (orbit mode, camera position, and orbit target) is persisted per scene across page refreshes via Studio sheet objects (`Devtools: <scene name>`), using non-undoable transactions so it does not pollute the undo history.
