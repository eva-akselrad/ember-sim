@group(0) @binding(0) var displayTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
  // Fullscreen triangle: UV (0,0) = top-left of texture matches top-left of screen
  let uv = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  var out: VSOut;
  out.pos = vec4f(uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return textureSample(displayTex, samp, in.uv);
}
