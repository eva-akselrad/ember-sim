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
@group(1) @binding(0) var<storage, read_write> walls: array<f32>;
@group(1) @binding(1) var<storage, read_write> vel: array<vec2f>;
@group(1) @binding(2) var<storage, read_write> oxygen: array<f32>;
@group(1) @binding(3) var<storage, read_write> temperature: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);

  if (walls[i] > 0.5) {
    vel[i] = vec2f(0.0);
    oxygen[i] = 0.0;
    return;
  }

  let edge = x == 0 || y == 0 || x == GRID - 1 || y == GRID - 1;
  if (edge) {
    oxygen[i] = mix(oxygen[i], u.o2Ambient, 0.5);
    temperature[i] = mix(temperature[i], u.t0, 0.02);
    vel[i] *= 0.98;
  }
}
