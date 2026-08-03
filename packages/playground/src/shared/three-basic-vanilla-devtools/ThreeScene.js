import {autoAddObject} from '@unseenco/theatre-threejs'
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
  Scene,
  ShaderMaterial,
  SphereGeometry,
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
    onFrame: spheresScene.onFrame,
  }
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

  const group = new Group()
  group.name = 'Spheres Group'
  scene.add(group)

  autoAddObject(group, sheet)

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
    sphere.name = `Sphere ${index + 1}`
    scene.add(sphere)

    if (index < 3) {
      autoAddObject(sphere, sheet)
    }
  }

  const mesh = new Mesh(
    new SphereGeometry(3),
    new MeshPhongMaterial({color: 0xffffff}),
  )
  mesh.name = 'Hero Sphere'
  scene.add(mesh)

  const shaderMaterial = new ShaderMaterial({
    uniforms: {
      uColor: {value: new Color(0xff6644)},
      uOpacity: {value: 0.85},
      uTime: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        float pulse = 0.65 + 0.35 * sin(uTime * 2.0);
        float lighting = 0.35 + 0.65 * max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        gl_FragColor = vec4(uColor * lighting, uOpacity * pulse);
      }
    `,
    transparent: true,
  })

  const shaderCube = new Mesh(new BoxGeometry(4, 4, 4), shaderMaterial)
  shaderCube.name = 'Shader Cube'
  shaderCube.position.set(12, 0, 0)
  scene.add(shaderCube)

  addInvisibleCameraPath(scene)

  camera.position.set(0, 0, 45)

  bindCameraTransformSheet(sheet, camera)
  autoAddObject(mesh, sheet, {objectKey: 'Hero Sphere'})
  autoAddObject(shaderCube, sheet, {exclude: ['uTime']})

  const onFrame = (elapsedTime) => {
    shaderMaterial.uniforms.uTime.value = elapsedTime
  }

  return {scene, camera, onFrame}
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
  cube.name = 'Cube'
  scene.add(cube)

  bindCameraTransformSheet(sheet, camera)
  autoAddObject(cube, sheet)

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
  cylinder.name = 'Cylinder'
  scene.add(cylinder)

  bindCameraTransformSheet(sheet, camera)
  autoAddObject(cylinder, sheet)

  return {scene, camera}
}
