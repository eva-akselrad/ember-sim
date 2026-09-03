import { N, SIM } from './constants';
import { BrushMode } from './constants';

export interface CpuSimState {
  fuel: Float32Array;
  temperature: Float32Array;
  smoke: Float32Array;
  oxygen: Float32Array;
  walls: Float32Array;
  vel: Float32Array;
}

export function createCpuState(): CpuSimState {
  return {
    fuel: new Float32Array(N),
    temperature: new Float32Array(N),
    smoke: new Float32Array(N),
    oxygen: new Float32Array(N).fill(SIM.O2_AMBIENT),
    walls: new Float32Array(N),
    vel: new Float32Array(N * 2),
  };
}

export function stampBrush(
  cpu: CpuSimState,
  gridX: number,
  gridY: number,
  radius: number,
  mode: BrushMode,
  strength: number,
): void {
  if (gridX < 0 || gridY < 0) return;

  const G = SIM.GRID;
  const cx = gridX;
  const cy = gridY;
  const r2 = radius * radius;

  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(G - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(G - 1, Math.ceil(cy + radius));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = 1 - dist / radius;
      const amount = strength * falloff;
      const i = y * G + x;

      switch (mode) {
        case BrushMode.Fuel:
          cpu.fuel[i] += amount * 2.0;
          break;
        case BrushMode.Heat:
          cpu.temperature[i] += amount * 6.0;
          break;
        case BrushMode.Wall:
          cpu.walls[i] = 1;
          cpu.vel[i * 2] = 0;
          cpu.vel[i * 2 + 1] = 0;
          cpu.fuel[i] = 0;
          cpu.smoke[i] = 0;
          cpu.temperature[i] = 0;
          cpu.oxygen[i] = 0;
          break;
        case BrushMode.Erase:
          cpu.walls[i] = 0;
          cpu.fuel[i] = 0;
          cpu.smoke[i] = 0;
          cpu.temperature[i] = 0;
          cpu.oxygen[i] = SIM.O2_AMBIENT;
          cpu.vel[i * 2] = 0;
          cpu.vel[i * 2 + 1] = 0;
          break;
        case BrushMode.Vent:
          cpu.walls[i] = 0;
          break;
        case BrushMode.Oxygen:
          cpu.oxygen[i] = SIM.O2_AMBIENT;
          break;
        case BrushMode.Fire:
          cpu.fuel[i] = Math.max(cpu.fuel[i], amount * 1.5);
          cpu.temperature[i] = Math.max(cpu.temperature[i], amount * 6.0);
          cpu.smoke[i] += amount * 0.5;
          break;
      }
    }
  }
}
