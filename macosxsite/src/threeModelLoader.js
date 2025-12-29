import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Creates a spinning 3D model viewer
 * @param {HTMLElement} container - The DOM element to mount the 3D scene
 * @param {string} modelPath - Path to the 3D model file (GLTF/GLB format)
 * @param {Object} options - Configuration options
 * @returns {Object} - Object with scene, camera, renderer, and cleanup function
 */
export function createSpinningModel(container, modelPath, options = {}) {
  const {
    width = 400,
    height = 400,
    autoRotate = true,
    rotationSpeed = 0.01,
    backgroundColor = 0xffffff,
    cameraPosition = { x: 0, y: 0, z: 5 }
  } = options

  // Create scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(backgroundColor)

  // Create camera
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)

  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  // Load model
  const loader = new GLTFLoader()
  let model = null
  let animationMixer = null

  loader.load(
    modelPath,
    (gltf) => {
      model = gltf.scene
      
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 2 / maxDim
      
      model.scale.multiplyScalar(scale)
      model.position.sub(center.multiplyScalar(scale))
      
      scene.add(model)

      // Handle animations if present
      if (gltf.animations && gltf.animations.length) {
        animationMixer = new THREE.AnimationMixer(model)
        gltf.animations.forEach((clip) => {
          animationMixer.clipAction(clip).play()
        })
      }
    },
    (progress) => {
      // Loading progress
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
    },
    (error) => {
      console.error('Error loading model:', error)
    }
  )

  // Animation loop
  let animationId = null
  const clock = new THREE.Clock()

  function animate() {
    animationId = requestAnimationFrame(animate)

    if (model && autoRotate) {
      model.rotation.y += rotationSpeed
    }

    if (animationMixer) {
      animationMixer.update(clock.getDelta())
    }

    renderer.render(scene, camera)
  }
  animate()

  // Cleanup function
  const cleanup = () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    if (renderer) {
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }

  // Handle window resize
  const handleResize = () => {
    const newWidth = container.clientWidth
    const newHeight = container.clientHeight
    camera.aspect = newWidth / newHeight
    camera.updateProjectionMatrix()
    renderer.setSize(newWidth, newHeight)
  }
  window.addEventListener('resize', handleResize)

  return {
    scene,
    camera,
    renderer,
    model,
    cleanup: () => {
      cleanup()
      window.removeEventListener('resize', handleResize)
    }
  }
}

