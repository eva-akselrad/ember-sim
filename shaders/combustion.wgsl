const GRID: i32 = 512;

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
@group(1) @binding(1) var<storage, read_write> vel: array<vec2f>;
@group(1) @binding(2) var<storage, read_write> temperature: array<f32>;
@group(1) @binding(3) var<storage, read_write> fuel: array<f32>;
@group(1) @binding(4) var<storage, read_write> smoke: array<f32>;
@group(1) @binding(5) var<storage, read_write> oxygen: array<f32>;
@group(1) @binding(6) var<storage, read_write> divSource: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(p * vec2f(0.1031, 0.1030));
  p3 += dot(p3, p3.yx + 33.33);
  return fract((p3.x + p3.y) * p3.y);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  divSource[i] = 0.0;

  if (walls[i] > 0.5) { return; }

  var burn = 0.0;
  let t = temperature[i];
  let f = fuel[i];
  let o = oxygen[i];

  if (t > u.tIgnition && f > u.fuelEps && o > u.o2Eps) {
    burn = min(f, min(o / u.stoich, u.burnRate * u.dt));
  }

  if (burn > 0.0) {
    fuel[i] = max(0.0, f - burn);
    oxygen[i] = max(0.0, o - burn * u.stoich);
    temperature[i] = t + burn * u.heatRelease;
    smoke[i] = smoke[i] + burn * u.smokeYield;

    // Expansion impulse for backdraft flash (applied next frame via divSource)
    divSource[i] = u.expansion * burn;

    // Immediate velocity kick with upward bias + noise
    let noise = hash21(vec2f(f32(x), f32(y))) * 2.0 - 1.0;
    vel[i] += vec2f(noise * 0.5, 1.0) * u.expansion * burn;
  }
}
