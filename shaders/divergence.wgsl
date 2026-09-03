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
@group(1) @binding(1) var<storage, read> vel: array<vec2f>;
@group(1) @binding(2) var<storage, read> divSource: array<f32>;
@group(2) @binding(0) var<storage, read_write> divergence: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

fn vel_x(x: i32, y: i32) -> f32 {
  if (walls[idx(x, y)] > 0.5) { return 0.0; }
  return vel[idx(x, y)].x;
}

fn vel_y(x: i32, y: i32) -> f32 {
  if (walls[idx(x, y)] > 0.5) { return 0.0; }
  return vel[idx(x, y)].y;
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  if (walls[i] > 0.5) {
    divergence[i] = 0.0;
    return;
  }

  let div = 0.5 * (
    (vel_x(x + 1, y) - vel_x(x - 1, y)) +
    (vel_y(x, y + 1) - vel_y(x, y - 1))
  );
  // divSource from previous frame combustion creates expansion pressure
  divergence[i] = div - divSource[i];
}
