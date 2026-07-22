import {types} from '@unseenco/theatre-core'
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
  const camera = new PerspectiveCamera(60, width / height, 0.1, 500)

  const light = new DirectionalLight()
  light.position.set(1, 5, 4)
  scene.add(light)

  const gridPositions = []
  for (let x = -20; x <= 20; x += 10) {
    for (let y = -20; y <= 20; y += 10) {
      for (let z = -20; z <= 20; z += 10) {
        if (x === 0 && y === 0 && z === 0) continue
        gridPositions.push({x, y, z})
      }
    }
  }

  const sphereGeometry = new SphereGeometry(1, 24, 24)
  for (const [index, position] of gridPositions.entries()) {
    const hue = (index / gridPositions.length) * 0.85
    const material = new MeshPhongMaterial({
      color: new Color().setHSL(hue, 0.55, 0.5),
    })
    const sphere = new Mesh(sphereGeometry, material)
    sphere.position.set(position.x, position.y, position.z)
    scene.add(sphere)
  }

  mesh = new Mesh(
    new SphereGeometry(3),
    new MeshPhongMaterial({color: 0xffffff}),
  )
  scene.add(mesh)

  camera.position.set(0, 0, 45)

  animateMaterial()
  animateTransform()

  return {scene, renderer, camera}
}
