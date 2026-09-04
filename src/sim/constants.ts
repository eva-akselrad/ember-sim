export const SIM = {
  DT: 1 / 60,
  BUOYANCY: 0.28,
  SMOKE_WEIGHT: 0.01,
  COOLING_AIR: 0.12,
  COOLING_WOOD: 0.02,
  T0: 0,
  T_IGNITION: 0.4,
  STOICH: 0.4,
  HEAT_RELEASE: 35.0,
  SMOKE_YIELD: 0.4,
  EXPANSION: 0.6,
  FUEL_EPS: 0.02,
  O2_EPS: 0.01,
  O2_AMBIENT: 1.0,
  O2_DIFFUSE: 0.028,
  O2_EDGE_REFILL: 0.05,
  O2_VENT_BLEED: 0.012,
  O2_SURGE_THRESHOLD: 0.025,
  O2_STARVED_THRESHOLD: 0.04,
  O2_REIGNITE_MIN: 0.18,
  EMBER_TEMP: 0.55,
  BACKDRAFT_BURN_MULT: 6,
  BACKDRAFT_EXPANSION_MULT: 4,
  BACKDRAFT_VEL_KICK: 3.5,
  BACKDRAFT_HEAT_BURST: 2.0,
  BACKDRAFT_SMOKE_BURST: 0.5,
  EXPANSION_MAX: 0.8,
  EXTINGUISH_AIR_RATE: 3.5,
  EXTINGUISH_SMOKE_RATE: 2.0,
  EXTINGUISH_FUEL_RATE: 2.2,
  SMOKE_DISSIPATE: 0.06,
  WOOD_SOLID: 0.12,
  FUEL_DENSITY: 1.0,
  HEAT_CONDUCT_WOOD: 6.0,
  HEAT_CONDUCT_AIR: 0.8,
  FIRE_SPREAD: 0.88,
  BURNING_TEMP: 1.2,
  /** Fuel-units consumed per second (full cell = FUEL_DENSITY). */
  WOOD_BURN_RATE: 0.1,
  COAL_BURN_RATE: 0.014,
  INFINITE_BURN_VIS: 0.04,
  CUSTOM_BURN_MIN: 3,
  CUSTOM_BURN_MAX: 300,
  CUSTOM_BURN_DEFAULT: 45,
} as const;

export const FuelType = {
  None: 0,
  Wood: 1,
  Coal: 2,
  Custom: 3,
} as const;
export type FuelType = (typeof FuelType)[keyof typeof FuelType];

/** fuelBurnRate < 0 means infinite burn for that cell. */
export const INFINITE_BURN_RATE = -1;

export const BrushMode = {
  None: 0,
  Wood: 1,
  Heat: 2,
  Wall: 3,
  Erase: 4,
  Vent: 5,
  Oxygen: 6,
  Fire: 7,
  Fireball: 8,
  Coal: 9,
  Custom: 10,
} as const;
export type BrushMode = (typeof BrushMode)[keyof typeof BrushMode];

export const VizMode = {
  Beauty: 0,
  Oxygen: 1,
  Temperature: 2,
  Fuel: 3,
  Smoke: 4,
} as const;
export type VizMode = (typeof VizMode)[keyof typeof VizMode];

export function burnRateForType(type: FuelType, cellRate: number): number {
  if (cellRate < 0) return 0;
  if (type === FuelType.Custom && cellRate > 0) return cellRate;
  if (type === FuelType.Coal) return SIM.COAL_BURN_RATE;
  if (type === FuelType.Wood) return SIM.WOOD_BURN_RATE;
  return SIM.WOOD_BURN_RATE;
}

export function burnSecondsForType(type: FuelType, cellRate: number): number | null {
  if (cellRate < 0) return null;
  const rate = burnRateForType(type, cellRate);
  if (rate <= 0) return null;
  return SIM.FUEL_DENSITY / rate;
}

export function customBurnRateFromSeconds(seconds: number): number {
  return SIM.FUEL_DENSITY / Math.max(1, seconds);
}

export function formatBurnDuration(seconds: number | null): string {
  if (seconds === null) return 'Infinite';
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${Math.round(seconds)}s`;
}
