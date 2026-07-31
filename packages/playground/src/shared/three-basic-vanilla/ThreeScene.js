import {types} from '@unseenco/theatre-core'
import {bindDockedThreeViewport} from '../utils/bindDockedThreeViewport'
import {
  Color,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  RawShaderMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'

/**
 * @param {import('@unseenco/theatre-core').IProject} project
 */
export function createThreeScene(project) {
  const canvas = document.getElementById('canvas')
  const sheet = project.sheet('Sphere')

  /** @type {Mesh | undefined} */
  let mesh

  function animateMaterial() {
    if (mesh === undefined) return
    const keys = {}
    for (const i in mesh.material) {
      const value = mesh.material[i]
      if (typeof value === 'number') {
        keys[i] = value
      } else if (value instanceof Vector2) {
        keys[i] = {x: value.x, y: value.y}
      } else if (value instanceof Vector3) {
        keys[i] = {x: value.x, y: value.y, z: value.z}
      } else if (value instanceof Color) {
        keys[i] = types.rgba({
          r: value.r * 255,
          g: value.g * 255,
          b: value.b * 255,
          a: 1,
        })
      }
    }

    if (
      mesh.material instanceof ShaderMaterial ||
      mesh.material instanceof RawShaderMaterial
    ) {
      const uniforms = mesh.material.uniforms
      keys.uniforms = {}
      for (const i in uniforms) {
        const uniform = uniforms[i].value
        if (typeof uniform === 'number') {
          keys.uniforms[i] = uniform
        } else if (uniform instanceof Vector2) {
          keys.uniforms[i] = {x: uniform.x, y: uniform.y}
        } else if (uniform instanceof Vector3) {
          keys.uniforms[i] = {x: uniform.x, y: uniform.y, z: uniform.z}
        } else if (uniform instanceof Color) {
          keys.uniforms[i] = {r: uniform.r, g: uniform.g, b: uniform.b}
        }
      }
    }

    sheet.object('Material', {material: keys}).onValuesChange((values) => {
      const {material} = values
      for (const key in material) {
        if (key === 'uniforms') {
          const uniforms = material[key]
          for (const uniKey in uniforms) {
            const uniform = uniforms[uniKey]
            if (typeof uniform === 'number') {
              mesh.material.uniforms[uniKey].value = uniform
            } else {
              mesh.material.uniforms[uniKey].value.copy(uniform)
            }
          }
        } else {
          const value = material[key]
          if (typeof value === 'number') {
            mesh.material[key] = value
          } else if (value.r !== undefined) {
            mesh.material[key].copy(value)
          } else if (value.x !== undefined) {
            mesh.material[key].copy(value)
          }
        }
      }
    })
  }

  function animateTransform() {
    if (mesh === undefined) return
    sheet
      .object('Transform', {
        transform: {
          position: {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          },
          rotation: {
            x: mesh.rotation.x,
            y: mesh.rotation.y,
            z: mesh.rotation.z,
          },
          scale: {
            x: mesh.scale.x,
            y: mesh.scale.y,
            z: mesh.scale.z,
          },
          visible: mesh.visible,
        },
      })
      .onValuesChange((values) => {
        if (mesh === undefined) return
        const {transform} = values
        mesh.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z,
        )
        mesh.rotation.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z,
        )
        mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z)
        mesh.visible = transform.visible
      })
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const renderer = new WebGLRenderer({
    antialias: true,
    canvas,
  })
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)

  const scene = new Scene()
  scene.background = new Color(0xcccccc)
  const camera = new PerspectiveCamera(60, width / height)
  camera.position.z = 10

  const light = new DirectionalLight()
  light.position.set(1, 5, 4)
  scene.add(light)

  mesh = new Mesh(new SphereGeometry(3), new MeshPhongMaterial())
  scene.add(mesh)

  function render() {
    requestAnimationFrame(render)
    renderer.render(scene, camera)
  }
  render()

  bindDockedThreeViewport({
    canvas,
    renderer,
    cameras: camera,
  })

  animateMaterial()
  animateTransform()
}
