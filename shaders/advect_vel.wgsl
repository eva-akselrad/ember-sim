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
@group(1) @binding(1) var<storage, read> velIn: array<vec2f>;
@group(2) @binding(0) var<storage, read_write> velOut: array<vec2f>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

fn sample_vel(pos: vec2f) -> vec2f {
  let clamped = clamp(pos, vec2f(0.5), vec2f(f32(GRID) - 0.5));
  let x0 = i32(floor(clamped.x - 0.5));
  let y0 = i32(floor(clamped.y - 0.5));
  let fx = fract(clamped.x - 0.5);
  let fy = fract(clamped.y - 0.5);

  let v00 = velIn[idx(x0, y0)];
  let v10 = velIn[idx(x0 + 1, y0)];
  let v01 = velIn[idx(x0, y0 + 1)];
  let v11 = velIn[idx(x0 + 1, y0 + 1)];

  let v0 = mix(v00, v10, fx);
  let v1 = mix(v01, v11, fx);
  return mix(v0, v1, fy);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  if (walls[i] > 0.5) {
    velOut[i] = vec2f(0.0);
    return;
  }

  let pos = vec2f(f32(x), f32(y)) + 0.5;
  let pos_back = pos - u.dt * velIn[i];
  velOut[i] = sample_vel(pos_back);
}
