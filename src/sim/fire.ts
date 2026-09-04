import {
  SIM,
  FuelType,
  INFINITE_BURN_RATE,
  burnRateForType,
  customBurnRateFromSeconds,
} from './constants';
import { N, SIZE, addSource, advect, ix, setBnd } from '../stam/fluid';

const VEL_CLAMP = 3.5;
const JACOBI_ITERS = 20;
const ZERO_EXPANSION = new Float32Array(SIZE);

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function isWall(walls: Uint8Array, i: number, j: number): boolean {
  return walls[ix(i, j)] !== 0;
}

function isWood(fuel: Float32Array, i: number, j: number): boolean {
  return fuel[ix(i, j)] > SIM.WOOD_SOLID;
}

function isSolid(walls: Uint8Array, fuel: Float32Array, i: number, j: number): boolean {
  return isWall(walls, i, j) || isWood(fuel, i, j);
}

function clampVel(u: Float32Array, v: Float32Array, walls: Uint8Array, fuel: Float32Array): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isSolid(walls, fuel, i, j)) continue;
      const id = ix(i, j);
      u[id] = Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, u[id]));
      v[id] = Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, v[id]));
    }
  }
}

function zeroVelSolids(
  u: Float32Array,
  v: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (!isSolid(walls, fuel, i, j)) continue;
      const id = ix(i, j);
      u[id] = 0;
      v[id] = 0;
    }
  }
}

function pAt(
  p: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  x: number,
  y: number,
  cx: number,
  cy: number,
): number {
  if (isSolid(walls, fuel, x, y)) return p[ix(cx, cy)];
  return p[ix(x, y)];
}

function projectWalls(
  u: Float32Array,
  v: Float32Array,
  p: Float32Array,
  div: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  expansion: Float32Array,
): void {
  const h = 1 / N;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const id = ix(i, j);
      if (isSolid(walls, fuel, i, j)) {
        div[id] = 0;
        p[id] = 0;
        continue;
      }
      div[id] =
        -0.5 *
          h *
          (u[ix(i + 1, j)] - u[ix(i - 1, j)] + v[ix(i, j + 1)] - v[ix(i, j - 1)]) -
        expansion[id];
      p[id] = 0;
    }
  }
  setBnd(0, div);
  setBnd(0, p);
  for (let k = 0; k < JACOBI_ITERS; k++) {
    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= N; j++) {
        if (isSolid(walls, fuel, i, j)) continue;
        p[ix(i, j)] =
          (div[ix(i, j)] +
            pAt(p, walls, fuel, i - 1, j, i, j) +
            pAt(p, walls, fuel, i + 1, j, i, j) +
            pAt(p, walls, fuel, i, j - 1, i, j) +
            pAt(p, walls, fuel, i, j + 1, i, j)) /
          4;
      }
    }
    setBnd(0, p);
  }
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const id = ix(i, j);
      if (isSolid(walls, fuel, i, j)) {
        u[id] = 0;
        v[id] = 0;
        continue;
      }
      u[id] -= 0.5 * (pAt(p, walls, fuel, i + 1, j, i, j) - pAt(p, walls, fuel, i - 1, j, i, j)) / h;
      v[id] -= 0.5 * (pAt(p, walls, fuel, i, j + 1, i, j) - pAt(p, walls, fuel, i, j - 1, i, j)) / h;
    }
  }
  setBnd(1, u);
  setBnd(2, v);
  zeroVelSolids(u, v, walls, fuel);
  clampVel(u, v, walls, fuel);
}

function advectScalarWalls(
  d: Float32Array,
  d0: Float32Array,
  u: Float32Array,
  v: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  dt: number,
  keepWood = false,
): void {
  const dt0 = dt * N;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const id = ix(i, j);
      if (isWall(walls, i, j)) {
        d[id] = 0;
        continue;
      }
      if (isWood(fuel, i, j)) {
        d[id] = keepWood ? d0[id] : 0;
        continue;
      }
      let x = i - dt0 * u[id];
      let y = j - dt0 * v[id];
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
      d[id] =
        s0 * (t0 * d0[ix(i0, j0)] + t1 * d0[ix(i0, j1)]) +
        s1 * (t0 * d0[ix(i1, j0)] + t1 * d0[ix(i1, j1)]);
      d[id] = Math.max(0, d[id]);
    }
  }
  setBnd(0, d);
}

function velStepFire(
  u: Float32Array,
  v: Float32Array,
  u0: Float32Array,
  v0: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  expansion: Float32Array,
  p: Float32Array,
  div: Float32Array,
  uTmp: Float32Array,
  vTmp: Float32Array,
  dt: number,
): void {
  addSource(u, u0, dt);
  addSource(v, v0, dt);
  zeroVelSolids(u, v, walls, fuel);

  projectWalls(u, v, p, div, walls, fuel, ZERO_EXPANSION);

  uTmp.set(u);
  vTmp.set(v);
  advect(1, u, uTmp, uTmp, vTmp, dt);
  advect(2, v, vTmp, uTmp, vTmp, dt);
  zeroVelSolids(u, v, walls, fuel);

  projectWalls(u, v, p, div, walls, fuel, expansion);
}

function diffuseO2(
  o2: Float32Array,
  o2Prev: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  rate: number,
  dt: number,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const id = ix(i, j);
      if (isSolid(walls, fuel, i, j)) {
        o2Prev[id] = 0;
        continue;
      }
      const sample = (x: number, y: number) =>
        isSolid(walls, fuel, x, y) ? o2[id] : o2[ix(x, y)];
      const lap =
        sample(i - 1, j) + sample(i + 1, j) + sample(i, j - 1) + sample(i, j + 1) - 4 * o2[id];
      o2Prev[id] = Math.min(1, Math.max(0, o2[id] + rate * lap * dt));
    }
  }
  o2.set(o2Prev);
}

/** O₂ available for burning at this cell (surface average for solid fuel). */
export function localBurnO2(
  o2: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  i: number,
  j: number,
): number {
  return surfaceO2(o2, fuel, walls, i, j);
}

function surfaceO2(
  o2: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  i: number,
  j: number,
): number {
  const id = ix(i, j);
  if (!isWood(fuel, i, j)) return o2[id];

  let sum = 0;
  let count = 0;
  const neighbors = [
    [i - 1, j],
    [i + 1, j],
    [i, j - 1],
    [i, j + 1],
  ];
  for (const [ni, nj] of neighbors) {
    if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
    if (isWall(walls, ni, nj) || isWood(fuel, ni, nj)) continue;
    sum += o2[ix(ni, nj)];
    count++;
  }
  return count > 0 ? sum / count : SIM.O2_AMBIENT;
}

function consumeSurfaceO2(
  o2: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  i: number,
  j: number,
  amount: number,
): void {
  if (!isWood(fuel, i, j)) {
    o2[ix(i, j)] = Math.max(0, o2[ix(i, j)] - amount);
    return;
  }

  const airCells: number[] = [];
  const neighbors = [
    [i - 1, j],
    [i + 1, j],
    [i, j - 1],
    [i, j + 1],
  ];
  for (const [ni, nj] of neighbors) {
    if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
    if (isWall(walls, ni, nj) || isWood(fuel, ni, nj)) continue;
    airCells.push(ix(ni, nj));
  }
  if (airCells.length === 0) return;
  const perCell = amount / airCells.length;
  for (const aid of airCells) {
    o2[aid] = Math.max(0, o2[aid] - perCell);
  }
}

function spreadFireToWood(
  temperature: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  tempCopy: Float32Array,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (!isWood(fuel, i, j) || isWall(walls, i, j)) continue;
      const id = ix(i, j);
      let hotNeighbor = 0;
      const neighbors = [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ];
      for (const [ni, nj] of neighbors) {
        if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
        if (isWall(walls, ni, nj)) continue;
        hotNeighbor = Math.max(hotNeighbor, tempCopy[ix(ni, nj)]);
      }
      if (hotNeighbor > SIM.T_IGNITION) {
        temperature[id] = Math.max(temperature[id], hotNeighbor * SIM.FIRE_SPREAD);
      }
    }
  }
}

function conductHeat(
  temperature: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  oxygen: Float32Array,
  tempCopy: Float32Array,
  dt: number,
): void {
  tempCopy.set(temperature);
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isWall(walls, i, j)) continue;
      const id = ix(i, j);

      if (isWood(fuel, i, j)) {
        let sum = 0;
        let count = 0;
        const neighbors = [
          [i - 1, j],
          [i + 1, j],
          [i, j - 1],
          [i, j + 1],
        ];
        for (const [ni, nj] of neighbors) {
          if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
          if (isWall(walls, ni, nj) || !isWood(fuel, ni, nj)) continue;
          sum += tempCopy[ix(ni, nj)];
          count++;
        }
        if (count > 0) {
          const avg = sum / count;
          temperature[id] += SIM.HEAT_CONDUCT_WOOD * (avg - tempCopy[id]) * dt;
        }
        // Burning wood heats adjacent air (surface heat — does not cool wood much)
        for (const [ni, nj] of neighbors) {
          if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
          if (isWall(walls, ni, nj) || isWood(fuel, ni, nj)) continue;
          const nid = ix(ni, nj);
          const o = surfaceO2(oxygen, fuel, walls, i, j);
          if (tempCopy[id] > SIM.T_IGNITION && o >= SIM.O2_EPS) {
            temperature[nid] = Math.max(temperature[nid], tempCopy[id] * 0.35);
          }
        }
        continue;
      }

      const sample = (x: number, y: number) => {
        if (isWall(walls, x, y)) return tempCopy[id];
        return tempCopy[ix(x, y)];
      };
      const avg =
        (sample(i - 1, j) + sample(i + 1, j) + sample(i, j - 1) + sample(i, j + 1)) * 0.25;
      temperature[id] += SIM.HEAT_CONDUCT_AIR * (avg - tempCopy[id]) * dt;
    }
  }
}

function applyBuoyancyForces(
  uPrev: Float32Array,
  vPrev: Float32Array,
  temperature: Float32Array,
  smoke: Float32Array,
  oxygen: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isSolid(walls, fuel, i, j)) continue;
      const id = ix(i, j);
      const o = isWood(fuel, i, j) ? surfaceO2(oxygen, fuel, walls, i, j) : oxygen[id];
      const burnFactor = Math.min(1, Math.max(o / SIM.O2_STARVED_THRESHOLD, temperature[id] > SIM.T_IGNITION ? 0.35 : 0));
      vPrev[id] +=
        SIM.BUOYANCY * temperature[id] * burnFactor - SIM.SMOKE_WEIGHT * smoke[id];
      uPrev[id] += (hash2(i, j) * 2 - 1) * temperature[id] * burnFactor * 0.03;
    }
  }
}

function applyBoundaries(oxygen: Float32Array, walls: Uint8Array, fuel: Float32Array): void {
  const rate = SIM.O2_EDGE_REFILL;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isSolid(walls, fuel, i, j)) continue;
      const edge = i === 1 || j === 1 || i === N || j === N;
      if (!edge) continue;
      const id = ix(i, j);
      oxygen[id] = oxygen[id] * (1 - rate) + SIM.O2_AMBIENT * rate;
    }
  }
}

/** Mark exterior air; bleed O₂ through vent mouths into sealed rooms. */
function refillOutsideO2(
  oxygen: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  outside: Uint8Array,
  queue: number[],
): void {
  outside.fill(0);
  queue.length = 0;

  const trySeed = (i: number, j: number) => {
    if (isSolid(walls, fuel, i, j)) return;
    const id = ix(i, j);
    if (outside[id]) return;
    outside[id] = 1;
    queue.push(id);
  };

  for (let i = 1; i <= N; i++) {
    trySeed(i, 1);
    trySeed(i, N);
  }
  for (let j = 2; j < N; j++) {
    trySeed(1, j);
    trySeed(N, j);
  }

  const stride = N + 2;
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi];
    const j = Math.floor(id / stride);
    const i = id - j * stride;
    const neighbors = [
      [i - 1, j],
      [i + 1, j],
      [i, j - 1],
      [i, j + 1],
    ];
    for (const [ni, nj] of neighbors) {
      if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
      if (isSolid(walls, fuel, ni, nj)) continue;
      const nid = ix(ni, nj);
      if (outside[nid]) continue;
      outside[nid] = 1;
      queue.push(nid);
    }
  }

  const bleed = SIM.O2_VENT_BLEED;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isSolid(walls, fuel, i, j)) continue;
      const id = ix(i, j);
      if (outside[id]) continue;

      const neighbors = [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ];
      for (const [ni, nj] of neighbors) {
        if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
        if (isSolid(walls, fuel, ni, nj)) continue;
        const nid = ix(ni, nj);
        if (!outside[nid]) continue;
        const delta = oxygen[nid] - oxygen[id];
        if (delta > 0) oxygen[id] += bleed * delta;
      }
    }
  }
}

/** Cool flame heat when O₂ is gone; retain dim embers on fuel for reignition. */
function starveOutFire(
  temperature: Float32Array,
  smoke: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  oxygen: Float32Array,
  dt: number,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isWall(walls, i, j)) continue;
      const id = ix(i, j);
      const o = isWood(fuel, i, j) ? surfaceO2(oxygen, fuel, walls, i, j) : oxygen[id];
      // Use starved threshold — not O2_EPS, or we kill the active flame front every frame
      if (o >= SIM.O2_STARVED_THRESHOLD) continue;

      if (isWood(fuel, i, j) && fuel[id] > SIM.FUEL_EPS) {
        const t = temperature[id];
        if (t > SIM.EMBER_TEMP) {
          temperature[id] = Math.max(
            SIM.EMBER_TEMP,
            t - SIM.EXTINGUISH_FUEL_RATE * (t - SIM.EMBER_TEMP) * dt,
          );
        }
        continue;
      }

      const t = temperature[id];
      // Hot air in the reaction zone can sit below O2_EPS while fuel still burns nearby
      if (t > SIM.T_IGNITION) continue;

      temperature[id] = Math.max(SIM.T0, t * (1 - SIM.EXTINGUISH_AIR_RATE * dt));
      smoke[id] = Math.max(0, smoke[id] * (1 - SIM.EXTINGUISH_SMOKE_RATE * dt));
    }
  }
}

function kickBackdraft(
  u: Float32Array,
  v: Float32Array,
  walls: Uint8Array,
  fuel: Float32Array,
  i: number,
  j: number,
  strength: number,
): void {
  const neighbors = [
    [i, j + 1, 0, 1],
    [i - 1, j + 1, -0.35, 0.85],
    [i + 1, j + 1, 0.35, 0.85],
    [i - 1, j, -0.6, 0.15],
    [i + 1, j, 0.6, 0.15],
  ];
  for (const [ni, nj, du, dv] of neighbors) {
    if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
    if (isWall(walls, ni, nj) || isWood(fuel, ni, nj)) continue;
    const nid = ix(ni, nj);
    u[nid] += du * strength;
    v[nid] += dv * strength;
  }
}

/** Only true vent backdraft — not normal combustion O₂ wobble. */
function backdraftIntensity(o: number, oPrev: number): number {
  const surge = o - oPrev;
  if (oPrev >= SIM.O2_STARVED_THRESHOLD) {
    // Open fire: require a large sudden O₂ influx (vent opened)
    if (surge < 0.08) return 0;
    return Math.min(1.5, surge * 4);
  }
  // Recovering from sealed-room starvation
  if (o < SIM.O2_REIGNITE_MIN) return 0;
  if (surge < SIM.O2_SURGE_THRESHOLD) return 0;
  return Math.min(2, 0.4 + surge * 3);
}

/** Flash hot air when O₂ rushes in near embers (dramatic vent backdraft). */
function backdraftAirFlash(
  temperature: Float32Array,
  smoke: Float32Array,
  oxygen: Float32Array,
  oxygenLast: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  expansion: Float32Array,
  u: Float32Array,
  v: Float32Array,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isSolid(walls, fuel, i, j)) continue;
      if (isWood(fuel, i, j)) continue;
      const id = ix(i, j);
      const o = oxygen[id];
      const oPrev = oxygenLast[id];
      const burst = backdraftIntensity(o, oPrev);
      if (burst <= 0) continue;
      // Must be recovering from genuine starvation, not ambient fluctuation
      if (oPrev >= SIM.O2_STARVED_THRESHOLD && o - oPrev < 0.08) continue;

      let hotFuel = 0;
      const neighbors = [
        [i - 1, j],
        [i + 1, j],
        [i, j - 1],
        [i, j + 1],
      ];
      for (const [ni, nj] of neighbors) {
        if (!isWood(fuel, ni, nj)) continue;
        hotFuel = Math.max(hotFuel, temperature[ix(ni, nj)]);
      }
      if (hotFuel < SIM.EMBER_TEMP) continue;

      const factor = burst * Math.min(1, hotFuel / SIM.BURNING_TEMP);
      temperature[id] += SIM.BACKDRAFT_HEAT_BURST * factor;
      smoke[id] += SIM.BACKDRAFT_SMOKE_BURST * factor;
      expansion[id] = Math.min(SIM.EXPANSION_MAX, expansion[id] + SIM.EXPANSION * factor * 0.2);
      kickBackdraft(u, v, walls, fuel, i, j, SIM.BACKDRAFT_VEL_KICK * factor);
    }
  }
}

function combust(
  temperature: Float32Array,
  fuel: Float32Array,
  fuelType: Uint8Array,
  fuelBurnRate: Float32Array,
  smoke: Float32Array,
  oxygen: Float32Array,
  oxygenLast: Float32Array,
  expansion: Float32Array,
  walls: Uint8Array,
  u: Float32Array,
  v: Float32Array,
  dt: number,
): void {
  expansion.fill(0);
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isWall(walls, i, j)) continue;
      const id = ix(i, j);
      const f = fuel[id];
      if (f < SIM.FUEL_EPS) continue;

      const t = temperature[id];
      const o = surfaceO2(oxygen, fuel, walls, i, j);
      const oPrev = isWood(fuel, i, j)
        ? surfaceO2(oxygenLast, fuel, walls, i, j)
        : oxygenLast[id];
      const burst = backdraftIntensity(o, oPrev);
      const backdraft = burst > 0 && t >= SIM.EMBER_TEMP && oPrev < SIM.O2_STARVED_THRESHOLD;
      const canBurn = t >= SIM.T_IGNITION && o >= SIM.O2_EPS;
      const reignite = backdraft && o >= SIM.O2_REIGNITE_MIN;
      if (!canBurn && !reignite) continue;

      const ftype = fuelType[id] as FuelType;
      const cellRate = fuelBurnRate[id];
      const heatMul = ftype === FuelType.Coal ? 1.35 : 1.0;
      const burstMul = reignite ? SIM.BACKDRAFT_BURN_MULT * burst : 1;

      if (cellRate < 0) {
        const vis = SIM.INFINITE_BURN_VIS * dt * (reignite ? burstMul : 1);
        consumeSurfaceO2(oxygen, fuel, walls, i, j, vis * SIM.STOICH * 0.4);
        temperature[id] = Math.max(t, SIM.BURNING_TEMP + 0.8);
        if (reignite) temperature[id] += SIM.BACKDRAFT_HEAT_BURST * burst;
        smoke[id] += vis * SIM.SMOKE_YIELD * 1.2;
        if (reignite) smoke[id] += SIM.BACKDRAFT_SMOKE_BURST * burst;
        expansion[id] = Math.min(
          SIM.EXPANSION_MAX,
          SIM.EXPANSION * vis * (reignite ? SIM.BACKDRAFT_EXPANSION_MULT * burst : 1),
        );
        ventFlame(temperature, smoke, fuel, walls, i, j, temperature[id], vis * (reignite ? 2 : 1));
        continue;
      }

      const rate = burnRateForType(ftype, cellRate);
      let burn = Math.min(f, Math.min(o / SIM.STOICH, rate * dt));
      if (reignite) burn = Math.min(f, Math.min(o / SIM.STOICH, rate * dt * burstMul));
      if (burn <= 0) continue;

      fuel[id] = f - burn;
      consumeSurfaceO2(oxygen, fuel, walls, i, j, burn * SIM.STOICH);
      temperature[id] = Math.max(t + burn * SIM.HEAT_RELEASE * heatMul, SIM.BURNING_TEMP);
      if (reignite) temperature[id] += SIM.BACKDRAFT_HEAT_BURST * burst;
      smoke[id] += burn * SIM.SMOKE_YIELD * (ftype === FuelType.Coal ? 0.7 : 1);
      if (reignite) smoke[id] += SIM.BACKDRAFT_SMOKE_BURST * burst;
      expansion[id] = Math.min(
        SIM.EXPANSION_MAX,
        SIM.EXPANSION * burn * (reignite ? SIM.BACKDRAFT_EXPANSION_MULT * burst : 1),
      );
      ventFlame(temperature, smoke, fuel, walls, i, j, temperature[id], burn * (reignite ? 2 : 1));
    }
  }

  backdraftAirFlash(
    temperature,
    smoke,
    oxygen,
    oxygenLast,
    fuel,
    walls,
    expansion,
    u,
    v,
  );
}

function ventFlame(
  temperature: Float32Array,
  smoke: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  i: number,
  j: number,
  heat: number,
  amount: number,
): void {
  const neighbors = [
    [i, j + 1],
    [i - 1, j + 1],
    [i + 1, j + 1],
    [i - 1, j],
    [i + 1, j],
  ];
  for (const [ni, nj] of neighbors) {
    if (ni < 1 || ni > N || nj < 1 || nj > N) continue;
    if (isWall(walls, ni, nj) || isWood(fuel, ni, nj)) continue;
    const nid = ix(ni, nj);
    temperature[nid] = Math.max(temperature[nid], heat * 0.55);
    smoke[nid] += amount * 0.25;
  }
}

function dissipate(
  temperature: Float32Array,
  smoke: Float32Array,
  fuel: Float32Array,
  walls: Uint8Array,
  oxygen: Float32Array,
  dt: number,
): void {
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      if (isWall(walls, i, j)) continue;
      const id = ix(i, j);
      const o = isWood(fuel, i, j) ? surfaceO2(oxygen, fuel, walls, i, j) : oxygen[id];
      if (o < SIM.O2_STARVED_THRESHOLD) continue;

      if (isWood(fuel, i, j)) {
        if (temperature[id] < SIM.T_IGNITION) {
          temperature[id] -= SIM.COOLING_WOOD * temperature[id] * dt;
        }
        continue;
      }
      const cool = smoke[id] > 0.25 ? SIM.COOLING_AIR * 0.5 : SIM.COOLING_AIR;
      temperature[id] -= cool * (temperature[id] - SIM.T0) * dt;
      smoke[id] = Math.max(0, smoke[id] - SIM.SMOKE_DISSIPATE * smoke[id] * dt);
    }
  }
}

export class FireSim {
  readonly u = new Float32Array(SIZE);
  readonly v = new Float32Array(SIZE);
  readonly uPrev = new Float32Array(SIZE);
  readonly vPrev = new Float32Array(SIZE);
  readonly temperature = new Float32Array(SIZE);
  readonly fuel = new Float32Array(SIZE);
  readonly fuelType = new Uint8Array(SIZE);
  readonly fuelBurnRate = new Float32Array(SIZE);
  readonly smoke = new Float32Array(SIZE);
  readonly oxygen = new Float32Array(SIZE);
  readonly walls = new Uint8Array(SIZE);
  private readonly tempPrev = new Float32Array(SIZE);
  private readonly smokePrev = new Float32Array(SIZE);
  private readonly o2Prev = new Float32Array(SIZE);
  private readonly oxygenLast = new Float32Array(SIZE);
  private readonly outsideAir = new Uint8Array(SIZE);
  private readonly outsideQueue: number[] = [];
  private readonly pressure = new Float32Array(SIZE);
  private readonly divergence = new Float32Array(SIZE);
  private readonly expansion = new Float32Array(SIZE);
  private readonly uTmp = new Float32Array(SIZE);
  private readonly vTmp = new Float32Array(SIZE);
  private readonly tempCopy = new Float32Array(SIZE);

  constructor() {
    this.oxygen.fill(SIM.O2_AMBIENT);
    this.oxygenLast.fill(SIM.O2_AMBIENT);
  }

  clear(): void {
    this.temperature.fill(0);
    this.fuel.fill(0);
    this.fuelType.fill(0);
    this.fuelBurnRate.fill(0);
    this.smoke.fill(0);
    this.oxygen.fill(SIM.O2_AMBIENT);
    this.oxygenLast.fill(SIM.O2_AMBIENT);
    this.walls.fill(0);
    this.u.fill(0);
    this.v.fill(0);
    this.expansion.fill(0);
    this.uPrev.fill(0);
    this.vPrev.fill(0);
  }

  resetCampfire(): void {
    this.clear();
    const cx = N * 0.5;
    const baseY = Math.floor(N * 0.72);
    // Solid wood log pile
    for (let j = baseY - 8; j <= baseY + 2; j++) {
      for (let i = 1; i <= N; i++) {
        const dx = Math.abs(i - cx);
        const row = j - (baseY - 8);
        const maxW = 38 - row * 3;
        if (dx < maxW) {
          const id = ix(i, j);
          this.fuel[id] = SIM.FUEL_DENSITY;
          this.fuelType[id] = FuelType.Wood;
          this.fuelBurnRate[id] = 0;
        }
      }
    }
    // Ignite top surface of log pile (air gaps between logs let O₂ in)
    for (let j = baseY - 1; j <= baseY + 2; j++) {
      for (let i = cx - 8; i <= cx + 8; i++) {
        const id = ix(i, j);
        if (this.fuel[id] > SIM.WOOD_SOLID) {
          this.temperature[id] = 4.0;
        }
      }
    }
    // Pre-warm air above the fire
    for (let j = baseY + 3; j <= baseY + 12; j++) {
      for (let i = cx - 5; i <= cx + 5; i++) {
        const t = 1.5 - (j - baseY - 3) * 0.1;
        if (t > 0) this.temperature[ix(i, j)] = t;
      }
    }
  }

  step(dt: number): void {
    applyBuoyancyForces(this.uPrev, this.vPrev, this.temperature, this.smoke, this.oxygen, this.walls, this.fuel);

    velStepFire(
      this.u,
      this.v,
      this.uPrev,
      this.vPrev,
      this.walls,
      this.fuel,
      this.expansion,
      this.pressure,
      this.divergence,
      this.uTmp,
      this.vTmp,
      dt,
    );

    // Gases advect; wood (fuel) stays fixed
    this.tempPrev.set(this.temperature);
    advectScalarWalls(this.temperature, this.tempPrev, this.u, this.v, this.walls, this.fuel, dt, true);
    this.tempCopy.set(this.temperature);
    spreadFireToWood(this.temperature, this.fuel, this.walls, this.tempCopy);
    conductHeat(this.temperature, this.fuel, this.walls, this.oxygen, this.tempCopy, dt);

    this.smokePrev.set(this.smoke);
    advectScalarWalls(this.smoke, this.smokePrev, this.u, this.v, this.walls, this.fuel, dt);
    this.o2Prev.set(this.oxygen);
    advectScalarWalls(this.oxygen, this.o2Prev, this.u, this.v, this.walls, this.fuel, dt);
    diffuseO2(this.oxygen, this.o2Prev, this.walls, this.fuel, SIM.O2_DIFFUSE, dt);
    refillOutsideO2(this.oxygen, this.walls, this.fuel, this.outsideAir, this.outsideQueue);
    applyBoundaries(this.oxygen, this.walls, this.fuel);
    starveOutFire(this.temperature, this.smoke, this.fuel, this.walls, this.oxygen, dt);

    combust(
      this.temperature,
      this.fuel,
      this.fuelType,
      this.fuelBurnRate,
      this.smoke,
      this.oxygen,
      this.oxygenLast,
      this.expansion,
      this.walls,
      this.u,
      this.v,
      dt,
    );
    dissipate(this.temperature, this.smoke, this.fuel, this.walls, this.oxygen, dt);

    this.oxygenLast.set(this.oxygen);
    this.uPrev.fill(0);
    this.vPrev.fill(0);
  }

  splatBrush(
    gx: number,
    gy: number,
    radius: number,
    mode: number,
    strength: number,
    velX = 0,
    velY = 0,
    customBurnSeconds: number = SIM.CUSTOM_BURN_DEFAULT,
    customInfinite: boolean = false,
  ): void {
    const r2 = radius * radius;
    for (let j = gy - radius; j <= gy + radius; j++) {
      for (let i = gx - radius; i <= gx + radius; i++) {
        if (i < 1 || i > N || j < 1 || j > N) continue;
        // Erase, Vent, and Wall must be able to target existing wall cells
        if (isWall(this.walls, i, j) && mode !== 3 && mode !== 4 && mode !== 5) continue;
        const dx = i - gx;
        const dy = j - gy;
        if (dx * dx + dy * dy > r2) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 - dist / radius;
        const amount = strength * falloff;
        const id = ix(i, j);

        switch (mode) {
          case 1: // Wood
            this.fuel[id] = SIM.FUEL_DENSITY;
            this.fuelType[id] = FuelType.Wood;
            this.fuelBurnRate[id] = 0;
            break;
          case 9: // Coal
            this.fuel[id] = SIM.FUEL_DENSITY;
            this.fuelType[id] = FuelType.Coal;
            this.fuelBurnRate[id] = 0;
            break;
          case 10: // Custom fuel
            this.fuel[id] = SIM.FUEL_DENSITY;
            this.fuelType[id] = FuelType.Custom;
            this.fuelBurnRate[id] = customInfinite
              ? INFINITE_BURN_RATE
              : customBurnRateFromSeconds(customBurnSeconds);
            break;
          case 2: // Heat
            this.temperature[id] += amount * 5;
            break;
          case 3: // Stone wall
            this.walls[id] = 1;
            this.fuel[id] = 0;
            this.fuelType[id] = FuelType.None;
            this.fuelBurnRate[id] = 0;
            this.smoke[id] = 0;
            this.temperature[id] = 0;
            this.oxygen[id] = 0;
            this.u[id] = 0;
            this.v[id] = 0;
            break;
          case 4: // Erase
            this.walls[id] = 0;
            this.fuel[id] = 0;
            this.fuelType[id] = FuelType.None;
            this.fuelBurnRate[id] = 0;
            this.smoke[id] = 0;
            this.temperature[id] = 0;
            this.oxygen[id] = SIM.O2_AMBIENT;
            this.u[id] = 0;
            this.v[id] = 0;
            break;
          case 5: // Vent
            this.walls[id] = 0;
            break;
          case 6: // O₂
            this.oxygen[id] = SIM.O2_AMBIENT;
            break;
          case 7: // Fire — wood + heat
            this.fuel[id] = SIM.FUEL_DENSITY;
            this.fuelType[id] = FuelType.Wood;
            this.fuelBurnRate[id] = 0;
            this.temperature[id] = Math.max(this.temperature[id], amount * 5);
            this.smoke[id] += amount * 0.15;
            this.uPrev[id] += velX * 0.2;
            this.vPrev[id] += velY * 0.2;
            break;
          case 8: // Fireball
            this.temperature[id] = Math.max(this.temperature[id], amount * 10);
            if (this.fuel[id] < SIM.WOOD_SOLID) {
              this.fuel[id] = SIM.FUEL_DENSITY * 0.5;
              this.fuelType[id] = FuelType.Wood;
              this.fuelBurnRate[id] = 0;
            }
            this.smoke[id] += amount * 0.4;
            this.uPrev[id] += velX * 0.5 + (hash2(i, j) * 2 - 1) * amount;
            this.vPrev[id] += velY * 0.5 + amount;
            break;
        }
      }
    }
  }
}
