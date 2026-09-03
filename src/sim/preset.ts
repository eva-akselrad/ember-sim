import { N, SIM } from './constants';
import type { SimFields } from './fields';
import { createCpuState } from './brushStamp';

function buildCampfireCpu(): {
  fuel: Float32Array;
  temperature: Float32Array;
  smoke: Float32Array;
  oxygen: Float32Array;
  walls: Float32Array;
  vel: Float32Array;
} {
  const G = SIM.GRID;
  const fuel = new Float32Array(N);
  const temperature = new Float32Array(N);
  const smoke = new Float32Array(N);
  const oxygen = new Float32Array(N).fill(SIM.O2_AMBIENT);
  const walls = new Float32Array(N);
  const vel = new Float32Array(N * 2);

  const cx = G * 0.5;
  const baseY = G * 0.78;

  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const i = y * G + x;
      const dx = x - cx;
      const dy = y - baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 55 && y >= baseY - 18) {
        fuel[i] = 1.2;
      }

      if (dist < 32) {
        const core = 1 - dist / 32;
        temperature[i] = 3.0 + core * 3.0;
        fuel[i] = Math.max(fuel[i], 0.8 + core * 0.6);
        smoke[i] = core * 0.7;
      }

      if (Math.abs(dx) < 22 && y < baseY && y > baseY - 140) {
        const rise = 1 - (baseY - y) / 140;
        temperature[i] = Math.max(temperature[i], rise * 2.5);
        smoke[i] = Math.max(smoke[i], rise * 0.5);
      }
    }
  }

  return { fuel, temperature, smoke, oxygen, walls, vel };
}

export function applyCampfirePreset(device: GPUDevice, fields: SimFields): void {
  const data = buildCampfireCpu();
  fields.setCpuScalars(
    data.fuel,
    data.temperature,
    data.smoke,
    data.oxygen,
    data.walls,
    data.vel,
    device,
  );
}

export function createPresetCpuState() {
  return createCpuState();
}

export { buildCampfireCpu };
