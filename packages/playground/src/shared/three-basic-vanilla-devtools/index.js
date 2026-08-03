import {Clock} from 'three'
import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {buildExtension} from '@unseenco/theatre-threejs'
import {bindDockedThreeViewport} from '../utils/bindDockedThreeViewport'
import {createThreeScenes} from './ThreeScene.js'

studio.initialize()

const project = getProject('Three Basic Vanilla Devtools')
const {renderer, scenes, onFrame} = createThreeScenes(project)
const clock = new Clock()

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

bindDockedThreeViewport({
  canvas: document.getElementById('canvas'),
  renderer,
  cameras: scenes.map(({camera}) => camera),
})

function render() {
  requestAnimationFrame(render)
  onFrame?.(clock.getElapsedTime())
  devtools.update()
  renderer.render(activeScene, devtools.getCamera())
}

render()
