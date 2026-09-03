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
@group(1) @binding(0) var<storage, read_write> walls: array<f32>;
@group(1) @binding(1) var<storage, read_write> vel: array<vec2f>;
@group(1) @binding(2) var<storage, read_write> temperature: array<f32>;
@group(1) @binding(3) var<storage, read_write> fuel: array<f32>;
@group(1) @binding(4) var<storage, read_write> smoke: array<f32>;
@group(1) @binding(5) var<storage, read_write> oxygen: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let xx = clamp(x, 0, GRID - 1);
  let yy = clamp(y, 0, GRID - 1);
  return u32(yy * GRID + xx);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = i32(gid.x);
  let y = i32(gid.y);
  if (x >= GRID || y >= GRID) { return; }

  let i = idx(x, y);
  let cx = u.brushX;
  let cy = u.brushY;
  let mode = i32(u.brushMode);
  let active = u.brushActive > 0.5;

  if (active && cx >= 0.0 && cy >= 0.0) {
    let dx = f32(x) - cx;
    let dy = f32(y) - cy;
    let dist = sqrt(dx * dx + dy * dy);
    if (dist <= u.brushRadius) {
      let falloff = 1.0 - dist / u.brushRadius;
      let amount = u.brushStrength * falloff;

      if (mode == 1) {
        fuel[i] += amount * 0.5;
      } else if (mode == 2) {
        temperature[i] += amount * 3.0;
        vel[i] += vec2f(u.mouseVelX, u.mouseVelY) * 0.1;
      } else if (mode == 3) {
        walls[i] = 1.0;
        vel[i] = vec2f(0.0);
        fuel[i] = 0.0;
        smoke[i] = 0.0;
        temperature[i] = 0.0;
        oxygen[i] = 0.0;
      } else if (mode == 4) {
        walls[i] = 0.0;
        fuel[i] = 0.0;
        smoke[i] = 0.0;
        temperature[i] = 0.0;
        oxygen[i] = u.o2Ambient;
        vel[i] = vec2f(0.0);
      } else if (mode == 5) {
        walls[i] = 0.0;
      } else if (mode == 6) {
        oxygen[i] = u.o2Ambient;
      }
    }
  }
}
