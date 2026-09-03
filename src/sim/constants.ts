export const SIM = {
  GRID: 512,
  DT: 1 / 60,
  WORKGROUP: 8,
  VEL_DIFFUSE: 0.0,
  JACOBI_ITERS: 40,
  BUOYANCY: 0.15,
  SMOKE_WEIGHT: 0.02,
  T0: 0,
  COOLING: 0.4,
  T_IGNITION: 1.2,
  BURN_RATE: 2.5,
  STOICH: 1.0,
  HEAT_RELEASE: 8.0,
  SMOKE_YIELD: 1.2,
  EXPANSION: 2.5,
  FUEL_EPS: 0.01,
  O2_EPS: 0.05,
  O2_AMBIENT: 1.0,
  O2_BOUNDARY_REFILL: 1.0,
  O2_DIFFUSE: 0.02,
  SMOKE_DISSIPATE: 0.15,
} as const;

export const N = SIM.GRID * SIM.GRID;
export const DISPATCH = SIM.GRID / SIM.WORKGROUP;

export const BrushMode = {
  None: 0,
  Fuel: 1,
  Heat: 2,
  Wall: 3,
  Erase: 4,
  Vent: 5,
  Oxygen: 6,
} as const;
export type BrushMode = (typeof BrushMode)[keyof typeof BrushMode];

export const VizMode = {
  Beauty: 0,
  Oxygen: 1,
  Temperature: 2,
  Fuel: 3,
} as const;
export type VizMode = (typeof VizMode)[keyof typeof VizMode];
