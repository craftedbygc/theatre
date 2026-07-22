import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {buildExtension} from '@unseenco/theatre-threejs'
import {createThreeScenes} from './ThreeScene.js'

studio.initialize()

const project = getProject('Three Basic Vanilla Devtools')
const {renderer, scenes} = createThreeScenes(project)

let activeScene = scenes[0].scene

const devtools = buildExtension({
  renderer,
  scenes,
  studio,
})

devtools.onSceneSwitch((_name, scene) => {
  activeScene = scene
})

studio.extend(devtools.extension)

function onWindowResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  renderer.setSize(width, height)
  for (const {camera} of scenes) {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}

window.addEventListener('resize', onWindowResize)

function render() {
  requestAnimationFrame(render)
  devtools.update()
  renderer.render(activeScene, devtools.getCamera())
}

render()
