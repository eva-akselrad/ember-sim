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
@group(1) @binding(1) var<storage, read> oxygenIn: array<f32>;
@group(2) @binding(0) var<storage, read_write> oxygenOut: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

fn o2_at(x: i32, y: i32, cx: i32, cy: i32) -> f32 {
  if (walls[idx(x, y)] > 0.5) {
    return oxygenIn[idx(cx, cy)];
  }
  return oxygenIn[idx(x, y)];
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  if (walls[i] > 0.5) {
    oxygenOut[i] = 0.0;
    return;
  }

  let oL = o2_at(x - 1, y, x, y);
  let oR = o2_at(x + 1, y, x, y);
  let oD = o2_at(x, y - 1, x, y);
  let oU = o2_at(x, y + 1, x, y);
  let lap = oL + oR + oD + oU - 4.0 * oxygenIn[i];

  oxygenOut[i] = clamp(oxygenIn[i] + u.o2Diffuse * lap * u.dt, 0.0, 1.0);
}
