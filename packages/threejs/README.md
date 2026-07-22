# @unseenco/theatre-threejs

Three.js devtools extension for [Theatre.js Studio](https://www.theatrejs.com/).

## Usage

```js
import studio from '@unseenco/theatre-studio'
import {buildExtension} from '@unseenco/theatre-threejs'

const devtools = buildExtension({
  renderer,
  camera: sceneCamera,
  studio,
})

studio.extend(devtools.extension)

function loop() {
  requestAnimationFrame(loop)
  devtools.update()
  renderer.render(scene, devtools.getCamera())
}
```

The extension adds a toolbar button to toggle between your scene camera and an OrbitControls dev camera.

Devtools state (orbit mode, camera position, and orbit target) is persisted across page refreshes via a Studio sheet object, using non-undoable transactions so it does not pollute the undo history.
