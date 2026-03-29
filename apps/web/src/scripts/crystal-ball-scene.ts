/**
 * Purpose: Render an animated crystal-ball scene with controllable zoom for the oracle flow.
 * Interface: createCrystalBallScene(container) returns zoom/activity/destroy controls.
 * Invariants: render loop owns renderer lifecycle; zoom transitions are smooth and bounded.
 * Decisions: use a near-direct port of the reference raymarch shader, adapted for app state controls.
 */

import * as THREE from 'three'
import { fragmentShader, vertexShader } from './crystal-ball-shader'

type CrystalBallScene = {
  setZoomTarget: (value: number, immediate?: boolean) => void
  setActivityTarget: (value: number, immediate?: boolean) => void
  destroy: () => void
}

function createFallbackTexture(value: number): THREE.DataTexture {
  const data = new Uint8Array([value, value, value, 255])
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
  texture.needsUpdate = true
  return texture
}

function configureTiling(texture: THREE.Texture): void {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
}

function replaceUniformTexture(
  uniforms: { value: THREE.Texture },
  nextTexture: THREE.Texture,
  managedTextures: Set<THREE.Texture>
): void {
  const previous = uniforms.value
  uniforms.value = nextTexture
  managedTextures.add(nextTexture)

  if (previous !== nextTexture) {
    managedTextures.delete(previous)
    previous.dispose()
  }
}

function clampZoom(value: number): number {
  return Math.min(1.25, Math.max(0, value))
}

function clampActivity(value: number): number {
  return Math.min(1.5, Math.max(0, value))
}

export function createCrystalBallScene(container: HTMLElement): CrystalBallScene {
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  camera.position.z = 1

  const geometry = new THREE.PlaneGeometry(2, 2)
  const textureLoader = new THREE.TextureLoader()
  const managedTextures = new Set<THREE.Texture>()
  const noiseTexture = createFallbackTexture(84)
  const environmentTexture = createFallbackTexture(148)

  configureTiling(noiseTexture)
  configureTiling(environmentTexture)
  managedTextures.add(noiseTexture)
  managedTextures.add(environmentTexture)

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uZoom: { value: 0 },
    uActivity: { value: 0.45 },
    uNoise: { value: noiseTexture },
    uEnv: { value: environmentTexture }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  })

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.style.display = 'block'
  container.append(renderer.domElement)

  textureLoader.load(
    '/noise.png',
    (texture) => {
      configureTiling(texture)
      replaceUniformTexture(uniforms.uNoise, texture, managedTextures)
    },
    undefined,
    () => {
      throw new Error('Failed to load /noise.png texture.')
    }
  )

  textureLoader.load(
    '/env_lat-lon.png',
    (texture) => {
      configureTiling(texture)
      replaceUniformTexture(uniforms.uEnv, texture, managedTextures)
    },
    undefined,
    () => {
      throw new Error('Failed to load /env_lat-lon.png texture.')
    }
  )

  let targetZoom = 0
  let currentZoom = 0
  let targetActivity = 0.45
  let currentActivity = 0.45
  let rafId = 0
  const clock = new THREE.Clock()

  const resize = (): void => {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    renderer.setSize(width, height, true)
    uniforms.uResolution.value.set(width, height)
  }

  const render = (): void => {
    const elapsed = clock.getElapsedTime()
    currentZoom += (targetZoom - currentZoom) * 0.05
    currentActivity += (targetActivity - currentActivity) * 0.05
    uniforms.uTime.value = elapsed
    uniforms.uZoom.value = currentZoom
    uniforms.uActivity.value = currentActivity
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(render)
  }

  resize()
  window.addEventListener('resize', resize)
  render()

  return {
    setZoomTarget(value: number, immediate = false) {
      targetZoom = clampZoom(value)
      if (immediate) {
        currentZoom = targetZoom
      }
    },
    setActivityTarget(value: number, immediate = false) {
      targetActivity = clampActivity(value)
      if (immediate) {
        currentActivity = targetActivity
      }
    },
    destroy() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      for (const texture of managedTextures) {
        texture.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
