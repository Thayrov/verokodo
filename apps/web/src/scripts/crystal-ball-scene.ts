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

function clampActivity(value: number, reducedMotion: boolean): number {
  const upperBound = reducedMotion ? 0.62 : 1.5
  return Math.min(upperBound, Math.max(0, value))
}

export function createCrystalBallScene(container: HTMLElement): CrystalBallScene {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reducedMotion = reducedMotionQuery.matches

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
    uActivity: { value: clampActivity(0.45, reducedMotion) },
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

  const renderer = new THREE.WebGLRenderer({
    antialias: !reducedMotion,
    alpha: true,
    powerPreference: reducedMotion ? 'low-power' : 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, reducedMotion ? 1 : 1.5))
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
  let targetActivity = clampActivity(0.45, reducedMotion)
  let currentActivity = clampActivity(0.45, reducedMotion)
  let rafId = 0
  let destroyed = false
  let inViewport = true
  const clock = new THREE.Clock()
  const drawingBufferSize = new THREE.Vector2()
  const visualViewport = window.visualViewport

  const resize = (): void => {
    const rect = container.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || container.clientWidth || window.innerWidth))
    const height = Math.max(1, Math.round(rect.height || container.clientHeight || window.innerHeight))
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(drawingBufferSize)
    uniforms.uResolution.value.copy(drawingBufferSize)
  }

  const resizeObserver =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => resize())

  const render = (): void => {
    if (destroyed) {
      return
    }

    const elapsed = clock.getElapsedTime()
    currentZoom += (targetZoom - currentZoom) * 0.05
    currentActivity += (targetActivity - currentActivity) * 0.05
    uniforms.uTime.value = elapsed
    uniforms.uZoom.value = currentZoom
    uniforms.uActivity.value = currentActivity
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(render)
  }

  const stopRenderLoop = (): void => {
    if (rafId === 0) {
      return
    }

    cancelAnimationFrame(rafId)
    rafId = 0
    clock.stop()
  }

  const startRenderLoop = (): void => {
    if (rafId !== 0 || destroyed) {
      return
    }

    clock.start()
    render()
  }

  const updateRenderLoopState = (): void => {
    if (document.hidden || !inViewport) {
      stopRenderLoop()
      return
    }

    startRenderLoop()
  }

  const viewportObserver = new IntersectionObserver(
    (entries) => {
      const nextVisibility = entries.some((entry) => entry.isIntersecting)
      if (nextVisibility === inViewport) {
        return
      }

      inViewport = nextVisibility
      updateRenderLoopState()
    },
    { threshold: 0.01 }
  )

  const handleVisibilityChange = (): void => {
    updateRenderLoopState()
  }

  const handleMotionPreferenceChange = (): void => {
    reducedMotion = reducedMotionQuery.matches
    targetActivity = clampActivity(targetActivity, reducedMotion)
    currentActivity = clampActivity(currentActivity, reducedMotion)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, reducedMotion ? 1 : 1.5))
    resize()
  }

  if ('addEventListener' in reducedMotionQuery) {
    reducedMotionQuery.addEventListener('change', handleMotionPreferenceChange)
  } else {
    reducedMotionQuery.addListener(handleMotionPreferenceChange)
  }

  resize()
  window.addEventListener('resize', resize)
  visualViewport?.addEventListener('resize', resize)
  resizeObserver?.observe(container)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  viewportObserver.observe(container)
  startRenderLoop()

  return {
    setZoomTarget(value: number, immediate = false) {
      targetZoom = clampZoom(value)
      if (immediate) {
        currentZoom = targetZoom
      }
    },
    setActivityTarget(value: number, immediate = false) {
      targetActivity = clampActivity(value, reducedMotion)
      if (immediate) {
        currentActivity = targetActivity
      }
    },
    destroy() {
      destroyed = true
      stopRenderLoop()
      window.removeEventListener('resize', resize)
      visualViewport?.removeEventListener('resize', resize)
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      viewportObserver.disconnect()

      if ('removeEventListener' in reducedMotionQuery) {
        reducedMotionQuery.removeEventListener('change', handleMotionPreferenceChange)
      } else {
        reducedMotionQuery.removeListener(handleMotionPreferenceChange)
      }

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
