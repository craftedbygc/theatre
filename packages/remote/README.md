# @theatre/remote

Sync a [Theatre.js](https://github.com/theatre-js/theatre) project across
browser windows/tabs using `BroadcastChannel`, so the Studio editor UI can run
in one window while other windows just play back the result.

A window is treated as the editor when its URL contains the `#editor` hash;
every other window listens for updates and applies them to its own copy of
the project.

## Usage

```ts
import {getProject} from '@theatre/core'
import {RemoteController} from '@theatre/remote'

const project = getProject('My project')
RemoteController(project)
```

Sheets and sheet objects created through `remote.sheet(...)` /
`remote.sheetObject(...)` (exported alongside `RemoteController`) are kept in
sync between the editor window and every listener window.
