/**
 * Purpose: Provide GLSL shader source for the crystal ball raymarch scene.
 * Interface: Exports `vertexShader` and `fragmentShader` strings consumed by Three.js ShaderMaterial.
 * Invariants: Uniform names stay aligned with scene setup (`uResolution`, `uTime`, `uZoom`, `uActivity`, `uNoise`, `uEnv`).
 * Decisions: Keep a near-direct port of the reference shader while preserving app-friendly background integration.
 */

export const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

export const fragmentShader = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform float uActivity;
uniform sampler2D uNoise;
uniform sampler2D uEnv;

varying vec2 vUv;

const float eps = 0.005;
const int maxIterations = 256;
const float stepScale = 0.7;
const float stopThreshold = 0.001;

vec3 movement = vec3(0.0);
mat4 rotmat;
float gTime = 0.0;

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
  return vec3(
    tri(p.z + tri(p.y)),
    tri(p.z + tri(p.x)),
    tri(p.y + tri(p.x))
  );
}

float triNoise3D(vec3 p, float speed, float time) {
  float z = 1.4;
  float rz = 0.0;
  vec3 bp = p;

  for (float i = 0.0; i <= 3.0; i++) {
    vec3 dg = tri3(bp * 2.0);
    p += dg + time * 0.1 * speed;
    bp *= 1.8;
    z *= 1.5;
    p *= 1.2;

    float t = tri(p.z + tri(p.x + tri(p.y)));
    rz += t / z;
    bp += 0.14;
  }

  return rz;
}

mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
    oc * axis.x * axis.x + c,
    oc * axis.x * axis.y - axis.z * s,
    oc * axis.z * axis.x + axis.y * s,
    0.0,
    oc * axis.x * axis.y + axis.z * s,
    oc * axis.y * axis.y + c,
    oc * axis.y * axis.z - axis.x * s,
    0.0,
    oc * axis.z * axis.x - axis.y * s,
    oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.z + c,
    0.0,
    0.0,
    0.0,
    0.0,
    1.0
  );
}

struct Obj {
  float distance;
  float innerDistance;
  vec4 colour;
};

Obj worldSdf(vec3 p) {
  float world = 10.0;
  p = (vec4(p, 1.0) * rotmat).xyz;
  world = length(p) - 0.5;
  float innerDist = 0.0;

  if (world < 0.0) {
    innerDist = triNoise3D(p * 0.4, 1.0, gTime);
    float multi = smoothstep(0.0, 1.5, length(p * 6.0));
    innerDist *= multi * multi * multi;
    innerDist *= smoothstep(0.6, 0.4, length(p));
    innerDist *= sqrt(innerDist * 2.0);
  }

  return Obj(world, innerDist, vec4(0.5));
}

float worldNormals(vec3 p) {
  p = (vec4(p, 1.0) * rotmat).xyz;
  return length(p) - 0.5;
}

vec3 calculateNormal(vec3 p) {
  float gradientX = worldNormals(vec3(p.x + eps, p.y, p.z)) - worldNormals(vec3(p.x - eps, p.y, p.z));
  float gradientY = worldNormals(vec3(p.x, p.y + eps, p.z)) - worldNormals(vec3(p.x, p.y - eps, p.z));
  float gradientZ = worldNormals(vec3(p.x, p.y, p.z + eps)) - worldNormals(vec3(p.x, p.y, p.z - eps));
  return normalize(vec3(gradientX, gradientY, gradientZ));
}

float rayMarching(vec3 origin, vec3 dir, float start, float end, inout float field) {
  float sceneDist = 1e4;
  float rayDepth = start;
  float surfaceDepth = 0.0;
  Obj model;

  for (int i = 0; i < maxIterations; i++) {
    model = worldSdf(origin + dir * rayDepth);
    sceneDist = model.distance;

    if (field >= 1.0) {
      break;
    }
    if (rayDepth >= end) {
      if (surfaceDepth == 0.0) {
        surfaceDepth = end;
      }
      break;
    }

    if (sceneDist <= 0.001) {
      if (surfaceDepth == 0.0) {
        surfaceDepth = rayDepth + sceneDist;
      }
      field += abs(model.innerDistance) * 0.04;
      rayDepth += (1.0 - model.innerDistance) * 0.01;
    } else {
      rayDepth += sceneDist * stepScale;
    }
  }

  if (sceneDist >= stopThreshold) {
    rayDepth = end;
  } else {
    rayDepth += sceneDist;
  }

  return surfaceDepth;
}

vec3 lighting(vec3 sp, vec3 camPos, float dist, float field) {
  vec3 sceneColor = vec3(0.0);
  vec3 objColor = vec3(0.95, 0.9, 1.0) * (1.0 - field);
  vec3 surfNormal = calculateNormal(sp);
  vec3 lp = vec3(-1.5, 1.5, -1.0) + movement;
  vec3 ld = lp - sp;
  vec3 lColor = vec3(1.0, 0.97, 0.92) * 0.8;

  float len = length(ld);
  ld /= len;
  float sceneLen = length(camPos - sp);
  float sceneAtten = min(1.0 / (0.015 * sceneLen * sceneLen), 1.0);
  vec3 ref = reflect(-ld, surfNormal);

  float ambient = 0.5;
  float specularPower = 200.0;
  float diffuse = max(0.0, dot(surfNormal, ld));
  float specular = max(0.0, dot(ref, normalize(camPos - sp)));
  specular = pow(specular, specularPower);

  sceneColor += (objColor * (diffuse * 0.8 + ambient) + specular * 0.5) * lColor * 1.3;
  sceneColor = mix(sceneColor, vec3(1.0), 1.0 - sceneAtten * sceneAtten);
  sceneColor += texture2D(uEnv, surfNormal.xz * 2.0).rgb * 0.3 * clamp(dist, 0.0, 1.0);

  return sceneColor;
}

void main() {
  float activity = clamp(uActivity, 0.0, 1.5);
  float smokeTime = -10000.0 + uTime * (0.22 + activity * 0.22);
  float orbitTime = uTime * (0.14 + activity * 0.14);
  gTime = smokeTime;
  rotmat = rotationMatrix(vec3(0.0, 1.0, 0.0), smokeTime * 0.72);

  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = (2.0 * gl_FragCoord.xy / uResolution.xy - 1.0) * aspect;
  vec3 bgColor = mix(vec3(0.0, 0.0, 0.02), vec3(0.02, 0.04, 0.09), smoothstep(-0.9, 1.0, uv.y));

  movement = vec3(0.0);

  vec3 lookAt = vec3(0.0, 0.0, 0.0);
  float orbitAmplitude = 0.016 + activity * 0.02;
  vec3 cameraPosition = vec3(
    sin(orbitTime * 1.8) * orbitAmplitude,
    1.0 + cos(orbitTime * 1.3) * orbitAmplitude * 0.5,
    -2.0
  );

  float zoomNorm = clamp(uZoom / 1.25, 0.0, 1.0);
  cameraPosition.z = mix(-2.0, -0.82, zoomNorm);

  lookAt += movement;
  cameraPosition += movement;

  vec3 forward = normalize(lookAt - cameraPosition);
  vec3 right = normalize(vec3(forward.z, 0.0, -forward.x));
  vec3 up = normalize(cross(forward, right));

  float fov = 0.4;
  vec3 ro = cameraPosition;
  vec3 rd = normalize(forward + fov * uv.x * right + fov * uv.y * up);

  float field = 0.0;
  float dist = rayMarching(ro, rd, 0.0, 16.0, field);

  if (dist >= 16.0) {
    gl_FragColor = vec4(bgColor, 1.0);
    return;
  }

  vec3 sp = ro + rd * dist;
  vec3 sceneColor = lighting(sp, cameraPosition, dist, field);
  gl_FragColor = vec4(clamp(sceneColor, 0.0, 1.0), 1.0);
}
`
