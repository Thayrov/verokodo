/**
 * Purpose: Render an animated crystal-ball scene with controllable zoom for the oracle flow.
 * Interface: createCrystalBallScene(container) returns setZoomTarget/destroy controls.
 * Invariants: render loop owns renderer lifecycle; zoom transitions are smooth and bounded.
 * Decisions: use a compact custom shader inspired by the provided reference to keep integration simple.
 */

import * as THREE from 'three'

type CrystalBallScene = {
  setZoomTarget: (value: number) => void
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

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform sampler2D uNoise;
uniform sampler2D uEnv;

varying vec2 vUv;

float textureNoise(vec3 p) {
  vec2 uv = fract((p.xy * 0.135) + vec2(p.z * 0.11, p.z * 0.07));
  return texture2D(uNoise, uv).r;
}
float pn(vec3 p) {
  vec3 i = floor(p);
  p -= i;
  p *= p * (3.0 - 2.0 * p);
  p.xy = texture2D(uNoise, (p.xy + i.xy + vec2(37.0, 17.0) * i.z + 0.5) / 256.0, -100.0).yx;
  return mix(p.x, p.y, p.z);
}
float tri(float x) {
  return abs(fract(x) - 0.5);
}
vec3 tri3(vec3 p) {
  return vec3(tri(p.z + tri(p.y)), tri(p.z + tri(p.x)), tri(p.y + tri(p.x)));
}
float triNoise3D(vec3 p, float speed, float time) {
  float z = 1.4;
  float rz = 0.0;
  vec3 bp = p;
  for (float i = 0.0; i <= 3.0; i++) {
    vec3 dg = tri3(bp * 2.0);
    p += dg + vec3(time * 0.1 * speed);
    bp *= 1.8;
    z *= 1.5;
    p *= 1.2;
    float t = tri(p.z + tri(p.x + tri(p.y)));
    rz += t / z;
    bp += 0.14;
  }
  return rz;
}
mat2 rot2(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float sphereIntersect(vec3 ro, vec3 rd, float radius) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return -1.0;
  return -b - sqrt(h);
}

void main() {
  vec2 uv = (vUv * 2.0 - 1.0);
  uv.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.22;
  vec3 bgTop = vec3(0.02, 0.04, 0.09);
  vec3 bgBottom = vec3(0.00, 0.00, 0.02);
  vec3 color = mix(bgBottom, bgTop, smoothstep(-0.9, 1.0, uv.y));
  vec3 ro = vec3(sin(t * 0.55) * 0.075, cos(t * 0.43) * 0.05, 2.45 - (uZoom * 1.35));
  vec3 lookAt = vec3(0.0);
  vec3 forward = normalize(lookAt - ro);
  vec3 right = normalize(vec3(forward.z, 0.0, -forward.x));
  vec3 up = normalize(cross(forward, right));
  vec3 rd = normalize(forward + uv.x * right + uv.y * up * 0.96);

  float hit = sphereIntersect(ro, rd, 1.0);
  if (hit > 0.0) {
    vec3 pos = ro + rd * hit;
    vec3 normal = normalize(pos);

    float density = 0.0;
    float glow = 0.0;
    float transmittance = 1.0;
    vec3 volumeColor = vec3(0.0);
    const float marchDistance = 1.75;
    const float stepLength = marchDistance / 32.0;

    for (int i = 0; i < 32; i++) {
      float f = float(i) / 31.0;
      vec3 samplePos = ro + rd * (hit + f * marchDistance);
      samplePos.xz *= rot2(t * 0.22);
      samplePos.xy *= rot2(sin(t * 0.3) * 0.24);
      float radius = length(samplePos);
      float shell = 1.0 - smoothstep(0.14, 1.0, radius);
      float centerFade = smoothstep(0.0, 0.52, radius);
      float edgeFade = 1.0 - smoothstep(0.58, 1.02, radius);

      float largeShape = triNoise3D(samplePos * 0.46, 1.0, t * 2.6);
      float wisps = triNoise3D(samplePos * 1.28 + vec3(0.0, t * 0.72, 0.0), 0.84, t * 3.2);
      float grain = pn(samplePos * 8.0 + vec3(t * 0.55));

      float cloud = largeShape * 0.62 + wisps * 0.28 + grain * 0.1;

      float sampleDensity = smoothstep(0.34, 0.9, cloud) * shell * centerFade * edgeFade;
      float absorption = sampleDensity * 1.45 * stepLength;
      float alpha = clamp(1.0 - exp(-absorption), 0.0, 1.0);

      vec3 sampleColor = mix(vec3(0.28, 0.31, 0.37), vec3(0.93, 0.95, 0.98), clamp(cloud * 1.18, 0.0, 1.0));
      volumeColor += sampleColor * alpha * transmittance;
      transmittance *= 1.0 - alpha;
      density += sampleDensity;
      glow += shell * 0.01 * transmittance;
    }

    float volumeAlpha = clamp(1.0 - transmittance, 0.0, 1.0);
    float haze = clamp(density * 0.24, 0.0, 1.0);
    float fresnel = pow(1.0 - max(dot(normal, -rd), 0.0), 2.2);
    vec3 smokeTint = mix(vec3(0.28, 0.34, 0.52), vec3(0.86, 0.9, 1.0), haze);
    vec2 envUv = normal.xz * 0.35 + vec2(0.5);
    vec3 envColor = texture2D(uEnv, envUv).rgb;

    color = mix(color, volumeColor, clamp(volumeAlpha * 1.25 + glow, 0.0, 1.0));
    color = mix(color, vec3(0.9, 0.93, 0.99), volumeAlpha * 0.35);
    float sceneLen = length(ro - pos);
    float sceneAtten = min(1.0 / (0.018 * sceneLen * sceneLen), 1.0);
    float whiteFog = clamp(1.0 - sceneAtten * sceneAtten, 0.0, 1.0);
    color = mix(color, vec3(0.95, 0.96, 0.99), whiteFog * 0.84);
    color += envColor * (0.1 + fresnel * 0.2);
    color += smokeTint * fresnel * 0.62;

    float halo = smoothstep(1.22, 0.92, length(pos));
    color += mix(vec3(0.22, 0.29, 0.52), vec3(0.66, 0.73, 0.92), volumeAlpha) * halo * 0.2;
  }

  gl_FragColor = vec4(color, 1.0);
}
`

function clampZoom(value: number): number {
  return Math.min(1.25, Math.max(0, value))
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
    uniforms.uTime.value = elapsed
    uniforms.uZoom.value = currentZoom
    renderer.render(scene, camera)
    rafId = requestAnimationFrame(render)
  }

  resize()
  window.addEventListener('resize', resize)
  render()

  return {
    setZoomTarget(value: number) {
      targetZoom = clampZoom(value)
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
