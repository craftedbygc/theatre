import {types} from '@unseenco/theatre-core'
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
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
export function createThreeScenes(project) {
  const canvas = document.getElementById('canvas')
  const width = window.innerWidth
  const height = window.innerHeight
  const renderer = new WebGLRenderer({
    antialias: true,
    canvas,
  })
  renderer.setPixelRatio(devicePixelRatio)
  renderer.setSize(width, height)

  const spheresScene = createSpheresScene(
    project.sheet('Sphere'),
    width,
    height,
  )
  const cubeScene = createCubeScene(project.sheet('Cube'), width, height)
  const cylinderScene = createCylinderScene(
    project.sheet('Cylinder'),
    width,
    height,
  )

  return {
    renderer,
    scenes: [
      {scene: spheresScene.scene, camera: spheresScene.camera},
      {scene: cubeScene.scene, camera: cubeScene.camera},
      {scene: cylinderScene.scene, camera: cylinderScene.camera},
    ],
  }
}

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 * @param {Mesh} mesh
 */
function bindMaterialSheet(sheet, mesh) {
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

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 * @param {import('three').PerspectiveCamera} camera
 */
function bindCameraTransformSheet(sheet, camera) {
  sheet
    .object('Camera', {
      transform: {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
      },
      fov: camera.fov,
    })
    .onValuesChange((values) => {
      const {transform} = values
      camera.position.set(
        transform.position.x,
        transform.position.y,
        transform.position.z,
      )
      camera.rotation.set(
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      )
      camera.fov = values.fov
      camera.updateProjectionMatrix()
    })
}

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 * @param {Mesh} mesh
 */
function bindTransformSheet(sheet, mesh) {
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

/**
 * @param {Scene} scene
 */
function addInvisibleCameraPath(scene) {
  const points = []
  for (let index = 0; index <= 24; index++) {
    const t = index / 24
    points.push(
      new Vector3(
        Math.sin(t * Math.PI * 2) * 18,
        Math.sin(t * Math.PI * 5) * 4 + 2,
        -30 + t * 60,
      ),
    )
  }

  const path = new CatmullRomCurve3(points)
  const pathRoot = new Group()
  pathRoot.name = 'CameraPath'
  pathRoot.userData.path = path
  scene.add(pathRoot)
}

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 */
function createSpheresScene(sheet, width, height) {
  const scene = new Scene()
  scene.name = 'Spheres'
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

  const mesh = new Mesh(
    new SphereGeometry(3),
    new MeshPhongMaterial({color: 0xffffff}),
  )
  scene.add(mesh)

  addInvisibleCameraPath(scene)

  camera.position.set(0, 0, 45)

  bindCameraTransformSheet(sheet, camera)
  bindMaterialSheet(sheet, mesh)
  bindTransformSheet(sheet, mesh)

  return {scene, camera}
}

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 */
function createCubeScene(sheet, width, height) {
  const scene = new Scene()
  scene.name = 'Cube'
  scene.background = new Color(0x2a4d69)

  const camera = new PerspectiveCamera(60, width / height, 0.1, 500)
  camera.position.set(0, 2, 8)

  const light = new DirectionalLight(0xffffff, 1.2)
  light.position.set(4, 8, 6)
  scene.add(light)

  const cube = new Mesh(
    new BoxGeometry(3, 3, 3),
    new MeshPhongMaterial({color: 0xe8a838}),
  )
  scene.add(cube)

  bindCameraTransformSheet(sheet, camera)
  bindMaterialSheet(sheet, cube)
  bindTransformSheet(sheet, cube)

  return {scene, camera}
}

/**
 * @param {import('@unseenco/theatre-core').ISheet} sheet
 */
function createCylinderScene(sheet, width, height) {
  const scene = new Scene()
  scene.name = 'Cylinder'
  scene.background = new Color(0x3d2c4d)

  const camera = new PerspectiveCamera(60, width / height, 0.1, 500)
  camera.position.set(0, 3, 10)

  const light = new DirectionalLight(0xffffff, 1.2)
  light.position.set(-3, 6, 5)
  scene.add(light)

  const cylinder = new Mesh(
    new CylinderGeometry(1.5, 1.5, 5, 32),
    new MeshPhongMaterial({color: 0x6eceda}),
  )
  scene.add(cylinder)

  bindCameraTransformSheet(sheet, camera)
  bindMaterialSheet(sheet, cylinder)
  bindTransformSheet(sheet, cylinder)

  return {scene, camera}
}
