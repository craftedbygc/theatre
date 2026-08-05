# Theatre.js - Core

Theatre.js is an animation library for high-fidelity motion graphics. It is designed to help you express detailed animation, enabling you to create intricate movement, and convey nuance.

Theatre.js can be used both programmatically _and_ visually.

You can use Theatre.js to:

* Animate 3D objects made with THREE.js or other 3D libraries
  
  ![s](https://raw.githubusercontent.com/AriaMinaei/theatre-docs/main/docs/.vuepress/public/preview-3d-short.gif)

  <sub>Art by [drei.lu](https://sketchfab.com/models/91964c1ce1a34c3985b6257441efa500)</sub>

* Animate HTML/SVG via React or other libraries

  ![s](https://raw.githubusercontent.com/AriaMinaei/theatre-docs/main/docs/.vuepress/public/preview-dom.gif)

* Design micro-interactions

  ![s](https://raw.githubusercontent.com/AriaMinaei/theatre-docs/main/docs/.vuepress/public/preview-micro-interaction.gif)

* Choreograph generative interactive art

  ![s](https://raw.githubusercontent.com/AriaMinaei/theatre-docs/main/docs/.vuepress/public/preview-generative.gif)

* Or animate any other JS variable

  ![s](https://raw.githubusercontent.com/AriaMinaei/theatre-docs/main/docs/.vuepress/public/preview-console.gif)

## Documentation and Tutorials

You can find the documentation and video tutorials [here](https://theatrejs.com/docs/latest).

## Community

Join us on [Discord](https://discord.gg/bm9f8F9Y9N), follow the updates on [twitter](https://twitter.com/AriaMinaei) or write us an [email](mailto:hello@theatrejs.com).

## `@unseenco/theatre-core`

Theatre.js comes in two packages: `@unseenco/theatre-core` (the library) and `@unseenco/theatre-studio` (the editor). This package is the core library.

### Listing and unloading sheets / objects

Runtime helpers for tearing down loaded sheets and objects (for example when switching scenes). These drop in-memory instances so Studio stops showing them, but **do not** clear persisted project state. Recreating the same `sheetId` / object `key` restores prior prop overrides and sequence data.

```ts
import {getProject} from '@unseenco/theatre-core'

const project = getProject('My project')
const sheet = project.sheet('Scene')
sheet.object('Box', {x: 0, y: 0})

// List what is currently loaded
project.getSheets() // ISheet[]
sheet.getObjects() // ISheetObject[]

// Detach one object (sheet stays loaded)
sheet.detachObject('Box')

// Unload this sheet instance (all of its objects, then the sheet)
sheet.unload()

// Or from the project:
project.unloadSheet('Scene') // optional second arg: instanceId
project.unloadSheets() // unload every loaded sheet
```

Try the interactive demo in the playground: `/shared/unload-sheets/`.

## Bundle size

`@unseenco/theatre-core` is currently around 20KiB compressed with all its dependencies.

## License

Apache 2.0
