/**
 * Purpose: Run the intro smoke effect using the same fluid simulation as the reference codepen.
 * Interface: createIntroSmokeScene(canvas) -> { destroy }.
 * Invariants: intro smoke owns its listeners/animation frame and fully cleans up on destroy.
 */

type IntroSmokeController = { destroy: () => void }

type PointerState = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  down: boolean
  moved: boolean
  color: [number, number, number]
}

type WebGlContextBundle = {
  gl: WebGLRenderingContext | WebGL2RenderingContext
  ext: {
    internalFormat: number
    internalFormatRG: number
    formatRG: number
    texType: number
  }
  supportLinearFloat: unknown
}

type Fbo = [WebGLTexture, WebGLFramebuffer, number]

type DoubleFbo = {
  first: Fbo
  second: Fbo
  swap: () => void
}

const config = {
  TEXTURE_DOWNSAMPLE: 1,
  DENSITY_DISSIPATION: 0.98,
  VELOCITY_DISSIPATION: 0.99,
  PRESSURE_DISSIPATION: 0.8,
  PRESSURE_ITERATIONS: 25,
  CURL: 30,
  SPLAT_RADIUS: 0.005
}

const baseVertexShaderSource = `
precision highp float;
precision mediump sampler2D;

attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;

void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const clearShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform float value;

void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`

const displayShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTexture;

void main () {
  gl_FragColor = texture2D(uTexture, vUv);
}
`

const splatShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;

void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`

const advectionManualFilteringShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

vec4 bilerp (in sampler2D sam, in vec2 p) {
  vec4 st;
  st.xy = floor(p - 0.5) + 0.5;
  st.zw = st.xy + 1.0;

  vec4 uv = st * texelSize.xyxy;
  vec4 a = texture2D(sam, uv.xy);
  vec4 b = texture2D(sam, uv.zy);
  vec4 c = texture2D(sam, uv.xw);
  vec4 d = texture2D(sam, uv.zw);

  vec2 f = p - st.xy;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main () {
  vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
  gl_FragColor = dissipation * bilerp(uSource, coord);
  gl_FragColor.a = 1.0;
}
`

const advectionShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  gl_FragColor = dissipation * texture2D(uSource, coord);
}
`

const divergenceShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;

vec2 sampleVelocity (in vec2 uv) {
  vec2 multiplier = vec2(1.0, 1.0);
  if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
  if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
  if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
  if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
  return multiplier * texture2D(uVelocity, uv).xy;
}

void main () {
  float L = sampleVelocity(vL).x;
  float R = sampleVelocity(vR).x;
  float T = sampleVelocity(vT).y;
  float B = sampleVelocity(vB).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

const curlShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;

void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
}
`

const vorticityShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;

void main () {
  float L = texture2D(uCurl, vL).y;
  float R = texture2D(uCurl, vR).y;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
  force *= 1.0 / length(force + 0.00001) * curl * C;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
}
`

const pressureShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

vec2 boundary (in vec2 uv) {
  uv = min(max(uv, 0.0), 1.0);
  return uv;
}

void main () {
  float L = texture2D(uPressure, boundary(vL)).x;
  float R = texture2D(uPressure, boundary(vR)).x;
  float T = texture2D(uPressure, boundary(vT)).x;
  float B = texture2D(uPressure, boundary(vB)).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

const gradientSubtractShaderSource = `
precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

vec2 boundary (in vec2 uv) {
  uv = min(max(uv, 0.0), 1.0);
  return uv;
}

void main () {
  float L = texture2D(uPressure, boundary(vL)).x;
  float R = texture2D(uPressure, boundary(vR)).x;
  float T = texture2D(uPressure, boundary(vT)).x;
  float B = texture2D(uPressure, boundary(vB)).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

function createPointer(): PointerState {
  return {
    id: -1,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
    color: [30, 0, 300]
  }
}

function getWebGLContext(canvas: HTMLCanvasElement): WebGlContextBundle | null {
  const params: WebGLContextAttributes = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false
  }

  let gl = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
  const isWebGL2 = Boolean(gl)

  if (!gl) {
    gl =
      (canvas.getContext('webgl', params) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl', params) as WebGLRenderingContext | null)
  }

  if (!gl) return null

  const halfFloat = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null
  let supportLinearFloat: unknown = gl.getExtension('OES_texture_half_float_linear')

  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float')
    supportLinearFloat = gl.getExtension('OES_texture_float_linear')
  }

  if (!isWebGL2 && !halfFloat) return null

  gl.clearColor(0.0, 0.0, 0.0, 1.0)

  const internalFormat = isWebGL2 ? (gl as WebGL2RenderingContext).RGBA16F : gl.RGBA
  const internalFormatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG16F : gl.RGBA
  const formatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG : gl.RGBA
  const texType = isWebGL2
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : (halfFloat as { HALF_FLOAT_OES: number }).HALF_FLOAT_OES

  return {
    gl,
    ext: {
      internalFormat,
      internalFormatRG,
      formatRG,
      texType
    },
    supportLinearFloat
  }
}

export function createIntroSmokeScene(canvas: HTMLCanvasElement): IntroSmokeController {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  const glContext = getWebGLContext(canvas)
  if (!glContext) return { destroy() {} }

  const { gl, ext, supportLinearFloat } = glContext
  const pointers: PointerState[] = [createPointer()]

  class GLProgram {
    uniforms: Record<string, WebGLUniformLocation | null> = {}
    program: WebGLProgram

    constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram()
      if (!program) throw new Error('Unable to create smoke shader program.')

      this.program = program
      gl.attachShader(this.program, vertexShader)
      gl.attachShader(this.program, fragmentShader)
      gl.linkProgram(this.program)

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(this.program) ?? 'Shader link failed.')
      }

      const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS)
      for (let index = 0; index < uniformCount; index += 1) {
        const uniformName = gl.getActiveUniform(this.program, index)?.name
        if (!uniformName) continue
        this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName)
      }
    }

    bind() {
      gl.useProgram(this.program)
    }
  }

  function compileShader(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Unable to create smoke shader.')

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed.')
    }

    return shader
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, baseVertexShaderSource)
  const clearShader = compileShader(gl.FRAGMENT_SHADER, clearShaderSource)
  const displayShader = compileShader(gl.FRAGMENT_SHADER, displayShaderSource)
  const splatShader = compileShader(gl.FRAGMENT_SHADER, splatShaderSource)
  const advectionShader = compileShader(gl.FRAGMENT_SHADER, advectionShaderSource)
  const advectionManualShader = compileShader(gl.FRAGMENT_SHADER, advectionManualFilteringShaderSource)
  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, divergenceShaderSource)
  const curlShader = compileShader(gl.FRAGMENT_SHADER, curlShaderSource)
  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, vorticityShaderSource)
  const pressureShader = compileShader(gl.FRAGMENT_SHADER, pressureShaderSource)
  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, gradientSubtractShaderSource)

  const clearProgram = new GLProgram(baseVertexShader, clearShader)
  const displayProgram = new GLProgram(baseVertexShader, displayShader)
  const splatProgram = new GLProgram(baseVertexShader, splatShader)
  const advectionProgram = new GLProgram(
    baseVertexShader,
    supportLinearFloat ? advectionShader : advectionManualShader
  )
  const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader)
  const curlProgram = new GLProgram(baseVertexShader, curlShader)
  const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader)
  const pressureProgram = new GLProgram(baseVertexShader, pressureShader)
  const gradientSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader)

  let textureWidth = 0
  let textureHeight = 0
  let density: DoubleFbo
  let velocity: DoubleFbo
  let divergence: Fbo
  let curl: Fbo
  let pressure: DoubleFbo

  function createFBO(
    textureId: number,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    texType: number,
    filterParam: number
  ): Fbo {
    gl.activeTexture(gl.TEXTURE0 + textureId)

    const texture = gl.createTexture()
    if (!texture) throw new Error('Unable to create smoke texture.')

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterParam)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterParam)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, texType, null)

    const framebuffer = gl.createFramebuffer()
    if (!framebuffer) throw new Error('Unable to create smoke framebuffer.')

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    return [texture, framebuffer, textureId]
  }

  function createDoubleFBO(
    textureId: number,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    texType: number,
    filterParam: number
  ): DoubleFbo {
    let first = createFBO(textureId, width, height, internalFormat, format, texType, filterParam)
    let second = createFBO(textureId + 1, width, height, internalFormat, format, texType, filterParam)

    return {
      get first() {
        return first
      },
      get second() {
        return second
      },
      swap() {
        const temp = first
        first = second
        second = temp
      }
    }
  }

  function initFramebuffers(): void {
    textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE
    textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE

    density = createDoubleFBO(
      0,
      textureWidth,
      textureHeight,
      ext.internalFormat,
      gl.RGBA,
      ext.texType,
      supportLinearFloat ? gl.LINEAR : gl.NEAREST
    )

    velocity = createDoubleFBO(
      2,
      textureWidth,
      textureHeight,
      ext.internalFormatRG,
      ext.formatRG,
      ext.texType,
      supportLinearFloat ? gl.LINEAR : gl.NEAREST
    )

    divergence = createFBO(
      4,
      textureWidth,
      textureHeight,
      ext.internalFormatRG,
      ext.formatRG,
      ext.texType,
      gl.NEAREST
    )

    curl = createFBO(5, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, ext.texType, gl.NEAREST)

    pressure = createDoubleFBO(
      6,
      textureWidth,
      textureHeight,
      ext.internalFormatRG,
      ext.formatRG,
      ext.texType,
      gl.NEAREST
    )
  }

  const blit = (() => {
    const vertexBuffer = gl.createBuffer()
    if (!vertexBuffer) throw new Error('Unable to create smoke vertex buffer.')

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)

    const indexBuffer = gl.createBuffer()
    if (!indexBuffer) throw new Error('Unable to create smoke index buffer.')

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    return (destination: WebGLFramebuffer | null) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination)
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }
  })()

  function splat(x: number, y: number, dx: number, dy: number, color: [number, number, number]): void {
    splatProgram.bind()

    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.first[2])
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
    gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height)
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0)
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS)
    blit(velocity.second[1])
    velocity.swap()

    gl.uniform1i(splatProgram.uniforms.uTarget, density.first[2])
    gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.3, color[1] * 0.3, color[2] * 0.3)
    blit(density.second[1])
    density.swap()
  }

  function resizeCanvas(): void {
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) return
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    initFramebuffers()
  }

  initFramebuffers()
  let lastTime = Date.now()
  let animationFrameId = 0

  function update(): void {
    resizeCanvas()

    const dt = Math.min((Date.now() - lastTime) / 1000, 0.016)
    lastTime = Date.now()

    gl.viewport(0, 0, textureWidth, textureHeight)

    advectionProgram.bind()
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2])
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.first[2])
    gl.uniform1f(advectionProgram.uniforms.dt, dt)
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION)
    blit(velocity.second[1])
    velocity.swap()

    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2])
    gl.uniform1i(advectionProgram.uniforms.uSource, density.first[2])
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION)
    blit(density.second[1])
    density.swap()

    for (let index = 0; index < pointers.length; index += 1) {
      const pointer = pointers[index]
      if (!pointer.moved) continue
      splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color)
      pointer.moved = false
    }

    curlProgram.bind()
    gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.first[2])
    blit(curl[1])

    vorticityProgram.bind()
    gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.first[2])
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2])
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
    gl.uniform1f(vorticityProgram.uniforms.dt, dt)
    blit(velocity.second[1])
    velocity.swap()

    divergenceProgram.bind()
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.first[2])
    blit(divergence[1])

    clearProgram.bind()
    let pressureTextureId = pressure.first[2]
    gl.activeTexture(gl.TEXTURE0 + pressureTextureId)
    gl.bindTexture(gl.TEXTURE_2D, pressure.first[0])
    gl.uniform1i(clearProgram.uniforms.uTexture, pressureTextureId)
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION)
    blit(pressure.second[1])
    pressure.swap()

    pressureProgram.bind()
    gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2])
    pressureTextureId = pressure.first[2]
    gl.activeTexture(gl.TEXTURE0 + pressureTextureId)

    for (let index = 0; index < config.PRESSURE_ITERATIONS; index += 1) {
      gl.bindTexture(gl.TEXTURE_2D, pressure.first[0])
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTextureId)
      blit(pressure.second[1])
      pressure.swap()
    }

    gradientSubtractProgram.bind()
    gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.first[2])
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.first[2])
    blit(velocity.second[1])
    velocity.swap()

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    displayProgram.bind()
    gl.uniform1i(displayProgram.uniforms.uTexture, density.first[2])
    blit(null)

    animationFrameId = window.requestAnimationFrame(update)
  }

  let colorCycleCount = 0
  let color: [number, number, number] = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2]

  function toCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(canvas.width, clientX - bounds.left)),
      y: Math.max(0, Math.min(canvas.height, clientY - bounds.top))
    }
  }

  function onMouseMove(event: MouseEvent): void {
    const point = toCanvasCoordinates(event.clientX, event.clientY)

    colorCycleCount += 1
    if (colorCycleCount > 25) {
      color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2]
      colorCycleCount = 0
    }

    const pointer = pointers[0]
    pointer.down = true
    pointer.color = color
    pointer.moved = pointer.down
    pointer.dx = (point.x - pointer.x) * 10.0
    pointer.dy = (point.y - pointer.y) * 10.0
    pointer.x = point.x
    pointer.y = point.y
  }

  function onTouchMove(event: TouchEvent): void {
    const touches = event.touches

    colorCycleCount += 1
    if (colorCycleCount > 25) {
      color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2]
      colorCycleCount = 0
    }

    for (let index = 0; index < touches.length; index += 1) {
      if (index >= pointers.length) pointers.push(createPointer())

      const point = toCanvasCoordinates(touches[index].clientX, touches[index].clientY)
      const pointer = pointers[index]
      const previousX = pointer.x
      const previousY = pointer.y

      pointer.id = touches[index].identifier
      pointer.down = true
      pointer.color = color
      pointer.moved = pointer.down
      pointer.dx = (point.x - previousX) * 10.0
      pointer.dy = (point.y - previousY) * 10.0
      pointer.x = point.x
      pointer.y = point.y
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('resize', resizeCanvas)

  update()

  return {
    destroy() {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('resize', resizeCanvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
}
