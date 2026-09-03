const GRID: i32 = 256;

struct Uniforms {
  dt: f32,
  gridSize: f32,
  buoyancy: f32,
  smokeWeight: f32,
  cooling: f32,
  tIgnition: f32,
  burnRate: f32,
  stoich: f32,
  heatRelease: f32,
  smokeYield: f32,
  expansion: f32,
  o2Ambient: f32,
  o2Diffuse: f32,
  smokeDissipate: f32,
  brushX: f32,
  brushY: f32,
  brushRadius: f32,
  brushMode: f32,
  brushStrength: f32,
  mouseVelX: f32,
  mouseVelY: f32,
  vizMode: f32,
  fuelEps: f32,
  o2Eps: f32,
  t0: f32,
  brushActive: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(1) @binding(0) var<storage, read> walls: array<f32>;
@group(1) @binding(1) var<storage, read> temperature: array<f32>;
@group(1) @binding(2) var<storage, read> fuel: array<f32>;
@group(1) @binding(3) var<storage, read> smoke: array<f32>;
@group(1) @binding(4) var<storage, read> oxygen: array<f32>;
@group(2) @binding(0) var displayTex: texture_storage_2d<rgba8unorm, write>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

fn blackbody(t: f32) -> vec3f {
  let clamped = clamp(t, 0.0, 4.0);
  let r = clamp(1.5 * clamped, 0.0, 1.0);
  let g = clamp(1.2 * (clamped - 0.3), 0.0, 1.0);
  let b = clamp(0.8 * (clamped - 0.8), 0.0, 1.0);
  return vec3f(r, g * 0.7, b * 0.3);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  let wall = walls[i] > 0.5;
  var color = vec3f(0.02, 0.02, 0.04);

  if (wall) {
    color = vec3f(0.5, 0.42, 0.35);
  } else {
    let viz = i32(u.vizMode);
    if (viz == 1) {
      let o = oxygen[i];
      color = vec3f(0.0, o * 0.8, o * 0.4);
    } else if (viz == 2) {
      let t = temperature[i];
      color = blackbody(t);
    } else if (viz == 3) {
      let f = fuel[i];
      color = vec3f(f * 0.9, f * 0.5, f * 0.1);
    } else {
      let t = temperature[i];
      let s = smoke[i];
      let heatColor = blackbody(t);
      let smokeColor = vec3f(0.05) * s;
      color = heatColor * (1.0 + 0.5 * s) + smokeColor;
      color = mix(color, vec3f(0.15), clamp(s * 0.3, 0.0, 0.7));
    }
  }

  textureStore(displayTex, vec2i(x, y), vec4f(color, 1.0));
}
