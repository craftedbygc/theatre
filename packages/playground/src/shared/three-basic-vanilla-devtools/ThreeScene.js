import {autoAddCamera, autoAddObject} from '@unseenco/theatre-threejs'
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Object3D,
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
 * @param {Scene} scene
 */
function registerSceneCamera(sheet, camera, scene) {
  camera.name = camera.name || 'Camera'
  autoAddCamera(camera, sheet, {scene})
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

  const testObject = sheet.object(
    'Test Object',
    {
      color: 0xff0000,
      opacity: 0.5,
      time: 0,
    },
    {
      transient: ['opacity'],
      static: ['color'],
    },
  )

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
  const sphereMaterial = new MeshPhongMaterial({color: 0xffffff})
  const sphereGrid = new InstancedMesh(
    sphereGeometry,
    sphereMaterial,
    gridPositions.length,
  )
  sphereGrid.name = 'Sphere Grid'

  const dummy = new Object3D()
  const instanceColor = new Color()
  for (const [index, position] of gridPositions.entries()) {
    dummy.position.set(position.x, position.y, position.z)
    dummy.updateMatrix()
    sphereGrid.setMatrixAt(index, dummy.matrix)
    instanceColor.setHSL(Math.random(), 0.55, 0.5)
    sphereGrid.setColorAt(index, instanceColor)
  }
  sphereGrid.instanceMatrix.needsUpdate = true
  if (sphereGrid.instanceColor) {
    sphereGrid.instanceColor.needsUpdate = true
  }

  scene.add(sphereGrid)
  autoAddObject(sphereGrid, sheet)

  // Two meshes share one named material — the second autoAddObject splits
  // it into "Shared Materials / Shared Material" and wires showPropsOf.
  const sharedMaterial = new MeshPhongMaterial({color: 0x4caf50})
  sharedMaterial.name = 'Shared Material'
  const sharedGeo = new BoxGeometry(3, 3, 3)
  const sharedMeshA = new Mesh(sharedGeo, sharedMaterial)
  sharedMeshA.name = 'Shared Mesh A'
  sharedMeshA.position.set(-8, 0, 8)
  scene.add(sharedMeshA)

  const sharedMeshB = new Mesh(sharedGeo, sharedMaterial)
  sharedMeshB.name = 'Shared Mesh B'
  sharedMeshB.position.set(8, 0, 8)
  scene.add(sharedMeshB)

  autoAddObject(sharedMeshA, sheet)
  autoAddObject(sharedMeshB, sheet)

  // Random-color DataTexture so we can verify autoAddObject does not
  // wipe procedural maps that have no URL-backed asset id.
  const mapSize = 64
  const mapData = new Uint8Array(mapSize * mapSize * 4)
  for (let i = 0; i < mapData.length; i += 4) {
    mapData[i] = Math.floor(Math.random() * 256)
    mapData[i + 1] = Math.floor(Math.random() * 256)
    mapData[i + 2] = Math.floor(Math.random() * 256)
    mapData[i + 3] = 255
  }
  const heroMap = new DataTexture(mapData, mapSize, mapSize)
  heroMap.needsUpdate = true

  const mesh = new Mesh(
    new SphereGeometry(3),
    new MeshStandardMaterial({color: 0xffffff, map: heroMap}),
  )
  mesh.name = 'Hero Sphere'
  scene.add(mesh)

  const shaderFallbackTexture = new DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
  )
  shaderFallbackTexture.needsUpdate = true

  const shaderMaterial = new ShaderMaterial({
    uniforms: {
      uColor: {value: new Color(0xff6644)},
      uOpacity: {value: 0.85, gui: {min: 0, max: 1, step: 0.01}},
      uDiffuseMap: {value: null},
      uTime: {value: 0},
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDiffuseMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        float pulse = 0.65 + 0.35 * sin(uTime * 2.0);
        float lighting = 0.35 + 0.65 * max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        vec3 sampled = texture2D(uDiffuseMap, vUv).rgb;
        vec3 baseColor = length(sampled) > 0.0 ? sampled : uColor;
        gl_FragColor = vec4(baseColor * lighting, uOpacity * pulse);
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

  registerSceneCamera(sheet, camera, scene)
  autoAddObject(mesh, sheet, {objectKey: 'Hero Sphere'})
  autoAddObject(shaderCube, sheet, {exclude: ['uTime']})

  if (!shaderMaterial.uniforms.uDiffuseMap.value) {
    shaderMaterial.uniforms.uDiffuseMap.value = shaderFallbackTexture
  }

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

  registerSceneCamera(sheet, camera, scene)
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

  registerSceneCamera(sheet, camera, scene)
  autoAddObject(cylinder, sheet)

  return {scene, camera}
}
