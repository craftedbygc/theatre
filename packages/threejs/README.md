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

devtools.onOrbitModeSwitch((enabled) => {
  // e.g. pause gameplay camera while orbiting
})

studio.extend(devtools.extension)

function loop() {
  requestAnimationFrame(loop)
  devtools.update()
  renderer.render(activeScene, devtools.getCamera())
}
```

The extension adds a toolbar flyout to switch between scenes (when more than one is configured), a toggle between your scene camera and an OrbitControls dev camera, and orbit-mode tools for camera frustum visualization, line overlays, and interactive transform editing. Use `devtools.isOrbitMode()` to read the current mode and `devtools.onOrbitModeSwitch(callback)` to react when it changes.

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

### Static and transient props

When `autoAddObject` registers props on a Theatre sheet object, most props are **static**: they are saved in project state, can be keyframed, and reload on refresh. Transform props, material colors/scalars/vectors, and shader uniform numbers all fall in this category.

**Transient** props are excluded from exported project state JSON. They still appear in Studio for the current session but reset on refresh. `autoAddObject` registers material texture slots and shader uniform textures as transient image props (`persist: false`).

### Texture props

Material texture slots (`map`, `normalMap`, etc.) and shader uniform textures are exposed as transient Theatre image props (see [Static and transient props](#static-and-transient-props)). Assignments apply for the current session only and are cleared on refresh. When you swap a texture, wrap/repeat/filter settings from the existing texture are preserved.

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

## autoAddCamera

Register a Three.js `Camera` on a Theatre sheet with transform props and camera-specific props. Scale is excluded by default (cameras are not meaningfully scaled in Three.js).

```js
import {autoAddCamera} from '@unseenco/theatre-threejs'

autoAddCamera(camera, sheet, {
  objectKey: 'Main Camera',
  scene, // add camera to scene if it has no parent; required for transform controls
  sensorHeight: 24, // mm, for focal length ↔ FOV conversion (default: 24)
  exclude: {
    transform: ['scale'],
    camera: ['zoom'], // focalLength, near, far, zoom
  },
})
```

For `PerspectiveCamera` instances, camera props include focal length (converted from FOV), `near`, `far`, and `zoom`. All camera props are static. An invisible selection hitbox is attached so the camera can be picked in orbit mode when used with `buildExtension`.

## Orbit-mode devtools

When the orbit camera is active, the toolbar exposes three optional helpers. Each toggle persists per scene (along with orbit mode and camera pose).

### Camera helper

Shows a `CameraHelper` frustum for the active scene camera. Useful for comparing the scene camera to the orbit camera while framing a shot.

### Line helpers

Reveals scene geometry that would otherwise be invisible:

- `Line`, `LineSegments`, and `LineLoop` objects in the scene graph
- `CatmullRomCurve3` instances stored on `object.userData` (for example `userData.path`)

The extension clones matching geometry into cyan overlay helpers; the original lines stay as-is. Helpers are rebuilt when you switch scenes or toggle the tool on.

### Transform controls

When enabled and a registered object with transform props is selected in the Theatre outline, Three.js `TransformControls` appear in the viewport. Dragging the gizmo writes position, rotation, and scale back to the Theatre sheet as an undoable scrub. Orbit controls are disabled while dragging.

The toolbar adds translate / rotate / scale and world / local space switches when an object is attached. The selected object must be in the active scene graph — pass `scene` to `autoAddCamera` if your camera is not already parented to a scene.

## Persistence

Scene names are taken from the optional `name` property, then from `scene.name` on the Three.js `Scene` instance, then default to `"Scene"` (with numeric suffixes when needed).

Devtools state (orbit mode, camera position, orbit target, and the camera / line / transform-controls helper toggles) is persisted per scene across page refreshes via Studio sheet objects (`Devtools: <scene name>`), using non-undoable transactions so it does not pollute the undo history.
