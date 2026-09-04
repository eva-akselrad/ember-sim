import { N } from './stam/fluid';
import { SIM, FuelType, VizMode as Viz } from './sim/constants';
import type { VizMode } from './sim/constants';
import type { FireSim } from './sim/fire';
import { localBurnO2 } from './sim/fire';

function blackbody(t: number): [number, number, number] {
  const heat = Math.min(6, Math.max(0, t));
  const core = Math.pow(Math.min(1, heat / 5), 0.45);
  const r = Math.min(255, 255 * Math.max(core, Math.min(1, heat / 2.2)));
  const g = Math.min(255, 255 * Math.max(core * 0.92, Math.min(1, heat / 2.8) * 0.42));
  const b = Math.min(255, 255 * Math.max(core * 0.65, Math.min(1, heat / 4) * 0.15));
  return [r, g, b];
}

function emberColor(t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, (t - SIM.T_IGNITION * 0.35) / (SIM.EMBER_TEMP * 1.2)));
  return [
    Math.floor(70 + k * 185),
    Math.floor(18 + k * 55),
    Math.floor(6 + k * 12),
  ];
}

function woodBaseColor(type: FuelType, f: number): [number, number, number] {
  const a = Math.min(1, f);
  switch (type) {
    case FuelType.Coal:
      return [Math.floor(28 + a * 35), Math.floor(26 + a * 30), Math.floor(24 + a * 28)];
    case FuelType.Custom:
      return [Math.floor(50 + a * 40), Math.floor(30 + a * 90), Math.floor(70 + a * 50)];
    default:
      return [Math.floor(70 + a * 50), Math.floor(45 + a * 30), Math.floor(25 + a * 15)];
  }
}

function mixColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [
    Math.floor(a[0] * (1 - k) + b[0] * k),
    Math.floor(a[1] * (1 - k) + b[1] * k),
    Math.floor(a[2] * (1 - k) + b[2] * k),
  ];
}

/** 0 = cold, 1 = full flame — smooth blend avoids harsh brown cutoff. */
function flameMix(t: number, o: number): number {
  const heat = Math.min(1, t / SIM.BURNING_TEMP);
  const ox = Math.min(1, o / (SIM.O2_EPS * 2.5));
  return heat * (0.25 + 0.75 * ox);
}

function solidFuelColor(
  type: FuelType,
  f: number,
  t: number,
  o: number,
): [number, number, number] {
  const wood = woodBaseColor(type, f);
  if (t < SIM.T_IGNITION * 0.35) return wood;

  const mix = flameMix(t, o);
  const ember = emberColor(t);
  const flame = blackbody(t);
  if (mix < 0.15) return mixColor(wood, ember, t / SIM.T_IGNITION);
  if (mix < 0.55) return mixColor(ember, flame, (mix - 0.15) / 0.4);
  return flame;
}

function fuelVizColor(
  type: FuelType,
  f: number,
  cellRate: number,
): [number, number, number] {
  if (f < SIM.FUEL_EPS) return [8, 8, 10];
  if (cellRate < 0) return [120, 60, 200];
  switch (type) {
    case FuelType.Coal:
      return [Math.floor(40 + f * 80), Math.floor(38 + f * 70), Math.floor(36 + f * 65)];
    case FuelType.Custom:
      return [Math.floor(40 + f * 60), Math.floor(80 + f * 100), Math.floor(60 + f * 70)];
    default:
      return [Math.floor(60 + f * 170), Math.floor(35 + f * 95), Math.floor(15 + f * 25)];
  }
}

function beautyColor(
  t: number,
  s: number,
  f: number,
  type: FuelType,
  o: number,
): [number, number, number] {
  if (f > SIM.WOOD_SOLID) return solidFuelColor(type, f, t, o);

  const mix = flameMix(t, o);
  if (mix < 0.03 && t < 0.08) {
    const smokeTint = Math.min(0.7, s * 0.4);
    return [
      Math.floor(12 + smokeTint * 20),
      Math.floor(10 + smokeTint * 16),
      Math.floor(8 + smokeTint * 12),
    ];
  }

  const ember = emberColor(Math.max(t, 0.05));
  const flame = blackbody(t);
  const [hr, hg, hb] = mix < 0.4 ? mixColor(ember, flame, mix / 0.4) : flame;

  const smokeTint = Math.min(0.45, s * 0.2 * (1 - mix * 0.6));
  let r = hr * (0.8 + 0.2 * mix);
  let g = hg * (0.8 + 0.2 * mix);
  let b = hb * (0.8 + 0.2 * mix);
  r = r * (1 - smokeTint) + 22 * smokeTint;
  g = g * (1 - smokeTint) + 18 * smokeTint;
  b = b * (1 - smokeTint) + 14 * smokeTint;
  return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('2D canvas not supported');
  const context = ctx;

  const scale = 4;
  const width = N * scale;
  const height = N * scale;
  canvas.width = width;
  canvas.height = height;

  const image = context.createImageData(width, height);
  const pixels = image.data;

  function draw(sim: FireSim, vizMode: VizMode): void {
    const { temperature, fuel, fuelType, fuelBurnRate, smoke, oxygen, walls } = sim;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = i + (N + 2) * j;
        let r: number;
        let g: number;
        let b: number;

        if (walls[idx]) {
          r = 100;
          g = 98;
          b = 95;
        } else if (vizMode === Viz.Oxygen) {
          const o = oxygen[idx];
          r = 5;
          g = Math.floor(o * 180);
          b = Math.floor(o * 90);
        } else if (vizMode === Viz.Temperature) {
          [r, g, b] = blackbody(temperature[idx]);
        } else if (vizMode === Viz.Fuel) {
          [r, g, b] = fuelVizColor(fuelType[idx] as FuelType, fuel[idx], fuelBurnRate[idx]);
        } else if (vizMode === Viz.Smoke) {
          const s = Math.min(1, smoke[idx] * 0.5);
          r = Math.floor(20 + s * 60);
          g = Math.floor(18 + s * 50);
          b = Math.floor(16 + s * 40);
        } else {
          const o = localBurnO2(oxygen, fuel, walls, i, j);
          [r, g, b] = beautyColor(
            temperature[idx],
            smoke[idx],
            fuel[idx],
            fuelType[idx] as FuelType,
            o,
          );
        }

        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const x = (i - 1) * scale + px;
            const y = (N - j) * scale + py;
            const p = (y * width + x) * 4;
            pixels[p] = r;
            pixels[p + 1] = g;
            pixels[p + 2] = b;
            pixels[p + 3] = 255;
          }
        }
      }
    }

    context.putImageData(image, 0, 0);
  }

  return { draw, width, height };
}
