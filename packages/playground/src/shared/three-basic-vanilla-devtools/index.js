import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {buildExtension} from '@unseenco/theatre-threejs'
import {createThreeScene} from './ThreeScene.js'

studio.initialize()

const project = getProject('Three Basic Vanilla Devtools')
const sceneCtx = createThreeScene(project)

const devtools = buildExtension({
  renderer: sceneCtx.renderer,
  camera: sceneCtx.camera,
  studio,
})

studio.extend(devtools.extension)

function render() {
  requestAnimationFrame(render)
  devtools.update()
  sceneCtx.renderer.render(sceneCtx.scene, devtools.getCamera())
}

render()
