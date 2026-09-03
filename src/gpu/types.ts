import { SIM } from '../sim/constants';

// 64 floats = 256 bytes (WebGPU uniform alignment)
export const UNIFORM_SIZE = 256;
export const UNIFORM_FLOATS = 64;

export interface SimUniformData {
  dt: number;
  gridSize: number;
  buoyancy: number;
  smokeWeight: number;
  cooling: number;
  tIgnition: number;
  burnRate: number;
  stoich: number;
  heatRelease: number;
  smokeYield: number;
  expansion: number;
  o2Ambient: number;
  o2Diffuse: number;
  smokeDissipate: number;
  brushX: number;
  brushY: number;
  brushRadius: number;
  brushMode: number;
  brushStrength: number;
  mouseVelX: number;
  mouseVelY: number;
  vizMode: number;
  fuelEps: number;
  o2Eps: number;
  t0: number;
  brushActive: number;
}

export function defaultUniforms(): SimUniformData {
  return {
    dt: SIM.DT,
    gridSize: SIM.GRID,
    buoyancy: SIM.BUOYANCY,
    smokeWeight: SIM.SMOKE_WEIGHT,
    cooling: SIM.COOLING,
    tIgnition: SIM.T_IGNITION,
    burnRate: SIM.BURN_RATE,
    stoich: SIM.STOICH,
    heatRelease: SIM.HEAT_RELEASE,
    smokeYield: SIM.SMOKE_YIELD,
    expansion: SIM.EXPANSION,
    o2Ambient: SIM.O2_AMBIENT,
    o2Diffuse: SIM.O2_DIFFUSE,
    smokeDissipate: SIM.SMOKE_DISSIPATE,
    brushX: -1,
    brushY: -1,
    brushRadius: 8,
    brushMode: 0,
    brushStrength: 1,
    mouseVelX: 0,
    mouseVelY: 0,
    vizMode: 0,
    fuelEps: SIM.FUEL_EPS,
    o2Eps: SIM.O2_EPS,
    t0: SIM.T0,
    brushActive: 0,
  };
}

export function packUniforms(u: SimUniformData): Float32Array {
  const data = new Float32Array(UNIFORM_FLOATS);
  data[0] = u.dt;
  data[1] = u.gridSize;
  data[2] = u.buoyancy;
  data[3] = u.smokeWeight;
  data[4] = u.cooling;
  data[5] = u.tIgnition;
  data[6] = u.burnRate;
  data[7] = u.stoich;
  data[8] = u.heatRelease;
  data[9] = u.smokeYield;
  data[10] = u.expansion;
  data[11] = u.o2Ambient;
  data[12] = u.o2Diffuse;
  data[13] = u.smokeDissipate;
  data[14] = u.brushX;
  data[15] = u.brushY;
  data[16] = u.brushRadius;
  data[17] = u.brushMode;
  data[18] = u.brushStrength;
  data[19] = u.mouseVelX;
  data[20] = u.mouseVelY;
  data[21] = u.vizMode;
  data[22] = u.fuelEps;
  data[23] = u.o2Eps;
  data[24] = u.t0;
  data[25] = u.brushActive;
  return data;
}
