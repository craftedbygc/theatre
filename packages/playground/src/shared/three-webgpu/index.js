import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {configureTheatreThreejs} from '@unseenco/theatre-threejs'
import {buildExtension} from '@unseenco/theatre-threejs/extension'
import {bindDockedThreeViewport} from '../utils/bindDockedThreeViewport'
import {autoAddCamera, autoAddObject} from '@unseenco/theatre-threejs'

// Import everything from three/webgpu to avoid duplicating the three bundle
import {
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Timer,
  TorusKnotGeometry,
  WebGPURenderer,
} from 'three/webgpu'

studio.initialize()
configureTheatreThreejs({})

async function main() {
  const canvas = document.getElementById('canvas')
  const width = window.innerWidth
  const height = window.innerHeight

  // ── Renderer ─────────────────────────────────────────────────────────────────
  const renderer = new WebGPURenderer({antialias: true, canvas})
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)

  // WebGPURenderer.init() is async — must await before the first render
  await renderer.init()

  // ── Scene ─────────────────────────────────────────────────────────────────────
  const scene = new Scene()
  scene.name = 'WebGPU Scene'
  scene.background = new Color(0x111827)

  const camera = new PerspectiveCamera(60, width / height, 0.1, 500)
  camera.position.set(0, 0, 20)

  const keyLight = new DirectionalLight(0xffffff, 2)
  keyLight.position.set(4, 8, 6)
  scene.add(keyLight)

  const fillLight = new DirectionalLight(0x8888ff, 0.6)
  fillLight.position.set(-4, -2, -4)
  scene.add(fillLight)

  const knot = new Mesh(
    new TorusKnotGeometry(2, 0.6, 128, 32),
    new MeshStandardMaterial({color: 0x5555ff, roughness: 0.35, metalness: 0.6}),
  )
  knot.name = 'Torus Knot'
  scene.add(knot)

  // ── Theatre.js ────────────────────────────────────────────────────────────────
  const project = getProject('Three WebGPU')
  await project.ready

  const sheet = project.sheet('Scene')
  autoAddCamera(camera, sheet, {scene})
  autoAddObject(knot, sheet)

  const devtools = buildExtension({
    renderer,
    scenes: [{scene, camera}],
    studio,
  })
  studio.extend(devtools.extension)

  bindDockedThreeViewport({
    canvas,
    renderer,
    cameras: [camera],
  })

  // ── Render loop ───────────────────────────────────────────────────────────────
  const timer = new Timer()

  function render() {
    requestAnimationFrame(render)
    timer.update()
    knot.rotation.y = timer.getElapsed() * 0.4
    devtools.update()
    renderer.render(scene, devtools.getCamera())
  }

  render()

  window.addEventListener('resize', () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
}

main().catch(console.error)
