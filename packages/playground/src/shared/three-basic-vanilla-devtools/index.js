import { Clock } from 'three'
import studio from '@unseenco/theatre-studio'
import { getProject } from '@unseenco/theatre-core'
import { configureTheatreThreejs } from '@unseenco/theatre-threejs'
import { buildExtension } from '@unseenco/theatre-threejs/extension'
import { bindDockedThreeViewport } from '../utils/bindDockedThreeViewport'
import { createThreeScenes } from './ThreeScene.js'

studio.initialize()

configureTheatreThreejs({
  autoAddObject: {
    exclude: {
      uniforms: ['uTime'],
    },
  },
})

async function main() {

  const project = getProject('Three Basic Vanilla Devtools', { assets: { baseUrl: '/public' } })
  await project.ready
  const { renderer, scenes, onFrame } = await createThreeScenes(project)
  const clock = new Clock()

  let activeScene = scenes[0].scene

  const devtools = buildExtension({
    renderer,
    scenes,
    studio,
    onSceneSwitch(_name, scene) {
      activeScene = scene
    },
    onOrbitModeSwitch(enabled) {
      console.log('orbit mode switched', enabled)
    },
  })

  studio.extend(devtools.extension)

  bindDockedThreeViewport({
    canvas: document.getElementById('canvas'),
    renderer,
    cameras: scenes.map(({ camera }) => camera),
  })

  function render() {
    requestAnimationFrame(render)
    onFrame?.(clock.getElapsedTime())
    devtools.update()
    renderer.render(activeScene, devtools.getCamera())
  }

  render()
}

main()