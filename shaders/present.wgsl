@group(0) @binding(0) var displayTex: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
  let x = f32((vi & 1u) << 1u);
  let y = f32((vi & 2u));
  var out: VSOut;
  out.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.uv = vec2f(x, 1.0 - y);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  return textureSample(displayTex, samp, in.uv);
}
