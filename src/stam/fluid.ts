/**
 * Jos Stam "Real-Time Fluid Dynamics for Games" — core routines.
 * Grid: N×N interior cells, (N+2)×(N+2) arrays with boundary layer.
 */

export const N = 128;
export const SIZE = (N + 2) * (N + 2);
const ITER = 20;

export function ix(i: number, j: number): number {
  return i + (N + 2) * j;
}

export function setBnd(b: number, x: Float32Array): void {
  for (let i = 1; i <= N; i++) {
    x[ix(0, i)] = b === 1 ? -x[ix(1, i)] : x[ix(1, i)];
    x[ix(N + 1, i)] = b === 1 ? -x[ix(N, i)] : x[ix(N, i)];
    x[ix(i, 0)] = b === 2 ? -x[ix(i, 1)] : x[ix(i, 1)];
    x[ix(i, N + 1)] = b === 2 ? -x[ix(i, N)] : x[ix(i, N)];
  }
  x[ix(0, 0)] = 0.5 * (x[ix(1, 0)] + x[ix(0, 1)]);
  x[ix(0, N + 1)] = 0.5 * (x[ix(1, N + 1)] + x[ix(0, N)]);
  x[ix(N + 1, 0)] = 0.5 * (x[ix(N, 0)] + x[ix(N + 1, 1)]);
  x[ix(N + 1, N + 1)] = 0.5 * (x[ix(N, N + 1)] + x[ix(N + 1, N)]);
}

export function addSource(x: Float32Array, s: Float32Array, dt: number): void {
  for (let i = 0; i < SIZE; i++) {
    x[i] += dt * s[i];
  }
}

export function diffuse(
  b: number,
  x: Float32Array,
  x0: Float32Array,
  diff: number,
  dt: number,
): void {
  const a = dt * diff * N * N;
  for (let k = 0; k < ITER; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        x[ix(i, j)] =
          (x0[ix(i, j)] +
            a *
              (x[ix(i - 1, j)] +
                x[ix(i + 1, j)] +
                x[ix(i, j - 1)] +
                x[ix(i, j + 1)])) /
          (1 + 4 * a);
      }
    }
    setBnd(b, x);
  }
}

export function advect(
  b: number,
  d: Float32Array,
  d0: Float32Array,
  u: Float32Array,
  v: Float32Array,
  dt: number,
): void {
  const dt0 = dt * N;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      let x = i - dt0 * u[ix(i, j)];
      let y = j - dt0 * v[ix(i, j)];
      if (x < 0.5) x = 0.5;
      if (x > N + 0.5) x = N + 0.5;
      const i0 = Math.floor(x);
      const i1 = i0 + 1;
      if (y < 0.5) y = 0.5;
      if (y > N + 0.5) y = N + 0.5;
      const j0 = Math.floor(y);
      const j1 = j0 + 1;
      const s1 = x - i0;
      const s0 = 1 - s1;
      const t1 = y - j0;
      const t0 = 1 - t1;
      d[ix(i, j)] =
        s0 * (t0 * d0[ix(i0, j0)] + t1 * d0[ix(i0, j1)]) +
        s1 * (t0 * d0[ix(i1, j0)] + t1 * d0[ix(i1, j1)]);
    }
  }
  setBnd(b, d);
}

export function project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array): void {
  const h = 1 / N;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      div[ix(i, j)] =
        -0.5 *
        h *
        (u[ix(i + 1, j)] - u[ix(i - 1, j)] + v[ix(i, j + 1)] - v[ix(i, j - 1)]);
      p[ix(i, j)] = 0;
    }
  }
  setBnd(0, div);
  setBnd(0, p);
  for (let k = 0; k < ITER; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        p[ix(i, j)] =
          (div[ix(i, j)] +
            p[ix(i - 1, j)] +
            p[ix(i + 1, j)] +
            p[ix(i, j - 1)] +
            p[ix(i, j + 1)]) /
          4;
      }
    }
    setBnd(0, p);
  }
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      u[ix(i, j)] -= 0.5 * (p[ix(i + 1, j)] - p[ix(i - 1, j)]) / h;
      v[ix(i, j)] -= 0.5 * (p[ix(i, j + 1)] - p[ix(i, j - 1)]) / h;
    }
  }
  setBnd(1, u);
  setBnd(2, v);
}

export function velStep(
  u: Float32Array,
  v: Float32Array,
  u0: Float32Array,
  v0: Float32Array,
  visc: number,
  dt: number,
  p: Float32Array,
  div: Float32Array,
): void {
  addSource(u, u0, dt);
  addSource(v, v0, dt);

  let uA = u;
  let uB = u0;
  [uA, uB] = [uB, uA];
  diffuse(1, uA, uB, visc, dt);

  let vA = v;
  let vB = v0;
  [vA, vB] = [vB, vA];
  diffuse(2, vA, vB, visc, dt);

  project(uA, vA, p, div);

  [uA, uB] = [uB, uA];
  [vA, vB] = [vB, vA];
  advect(1, uA, uB, uB, vB, dt);
  advect(2, vA, vB, uB, vB, dt);

  project(uA, vA, p, div);

  if (uA !== u) u.set(uA);
  if (vA !== v) v.set(vA);
}

/** Advect a scalar field (diff=0): swap buffers in/out. */
export function advectScalar(
  field: Float32Array,
  fieldPrev: Float32Array,
  u: Float32Array,
  v: Float32Array,
  dt: number,
): void {
  advect(0, fieldPrev, field, u, v, dt);
  field.set(fieldPrev);
}
