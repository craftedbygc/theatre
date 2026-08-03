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

Automatically adds a Three.js `Object3D` to a Theatre sheet, parsing transform data (position, rotation, scale, visible) and material properties (colors, scalars, vectors, textures, shader uniforms).

```js
import {autoAddObject} from '@unseenco/theatre-threejs'

const sheetObject = autoAddObject(mesh, sheet, {
  objectKey: 'My Mesh',
  exclude: {transform: ['scale'], material: ['normalMap']},
  include: {material: ['color', 'metalness', 'roughness']},
})
```

### Texture props

Material texture slots (`map`, `normalMap`, etc.) and shader uniform textures are exposed as Theatre image props with `persist: false`. Assignments apply for the current session only and are cleared on refresh. They are also transient (excluded from exported project state JSON). When you swap a texture, wrap/repeat/filter settings from the existing texture are preserved.

Shader uniform textures are detected by name (`uDiffuseMap`, `tDiffuse`, etc.) or by `gui: { type: 'texture' }` on the uniform.

When used together with `buildExtension`, selection is synced bidirectionally in orbit mode:

- Click a registered mesh in the viewport to select it in the Theatre outline
- Select an object in the outline to show a `BoxHelper` around the matching mesh

### Shader uniform `gui` options

For `ShaderMaterial` / `RawShaderMaterial`, `autoAddObject` reads optional `gui` metadata on each uniform and maps it to Theatre number prop options:

| Uniform `gui` | Theatre `types.number()` option |
| --- | --- |
| `min` / `max` | `range: [min, max]` |
| `step` | `nudgeMultiplier` |
| `type: 'texture'` | Registers the uniform as a Theatre image prop (useful when the uniform value is `null`) |

```js
import {ShaderMaterial, Color} from 'three'
import {autoAddObject} from '@unseenco/theatre-threejs'

const material = new ShaderMaterial({
  uniforms: {
    uColor: {value: new Color(1, 0.4, 0.2)},
    uOpacity: {
      value: 0.85,
      gui: {min: 0, max: 1, step: 0.01},
    },
    uDiffuseMap: {value: null},
    uTime: {value: 0}, // often excluded via configureTheatreThreejs when driven by your render loop
  },
  // vertexShader / fragmentShader ...
})

autoAddObject(new Mesh(geometry, material), sheet)
```

For `Vector2` / `Vector3` uniforms, set per-component `gui` options:

```js
uOffset: {
  value: new Vector2(0, 0),
  gui: {
    x: {min: -1, max: 1, step: 0.01},
    y: {min: -1, max: 1, step: 0.01},
  },
}
```

If `gui` is omitted, number uniforms default to `nudgeMultiplier: 0.01` with no range.

## Persistence

Scene names are taken from the optional `name` property, then from `scene.name` on the Three.js `Scene` instance, then default to `"Scene"` (with numeric suffixes when needed).

Devtools state (orbit mode, camera position, and orbit target) is persisted per scene across page refreshes via Studio sheet objects (`Devtools: <scene name>`), using non-undoable transactions so it does not pollute the undo history.
