import type { SimFields } from './fields';
import type { SimPipelines } from './pipelines';

function bg2(
  d: GPUDevice,
  layout: GPUBindGroupLayout,
  entries: GPUBindGroupEntry[],
): GPUBindGroup {
  return d.createBindGroup({ layout, entries });
}

export function buildForces(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.forcesG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.temperature.read } },
      { binding: 2, resource: { buffer: f.smoke.read } },
    ]),
    bg2(d, p.forcesG2, [{ binding: 0, resource: { buffer: f.vel.read } }]),
  ];
}

export function buildAdvectVel(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.advectVelG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.vel.read } },
    ]),
    bg2(d, p.advectVelG2, [{ binding: 0, resource: { buffer: f.vel.write } }]),
  ];
}

export function buildDivergence(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.divergenceG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.vel.read } },
      { binding: 2, resource: { buffer: f.divSource } },
    ]),
    bg2(d, p.divergenceG2, [{ binding: 0, resource: { buffer: f.divergence } }]),
  ];
}

export function buildJacobi(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.jacobiG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.pressure.read } },
      { binding: 2, resource: { buffer: f.divergence } },
    ]),
    bg2(d, p.jacobiG2, [{ binding: 0, resource: { buffer: f.pressure.write } }]),
  ];
}

export function buildProject(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.projectG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.pressure.read } },
    ]),
    bg2(d, p.projectG2, [{ binding: 0, resource: { buffer: f.vel.read } }]),
  ];
}

export function buildAdvectScalars(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.advectScalarsG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.vel.read } },
      { binding: 2, resource: { buffer: f.temperature.read } },
      { binding: 3, resource: { buffer: f.fuel.read } },
      { binding: 4, resource: { buffer: f.smoke.read } },
      { binding: 5, resource: { buffer: f.oxygen.read } },
    ]),
    bg2(d, p.advectScalarsG2, [
      { binding: 0, resource: { buffer: f.temperature.write } },
      { binding: 1, resource: { buffer: f.fuel.write } },
      { binding: 2, resource: { buffer: f.smoke.write } },
      { binding: 3, resource: { buffer: f.oxygen.write } },
    ]),
  ];
}

export function buildBoundaries(p: SimPipelines, f: SimFields): GPUBindGroup {
  return bg2(p.device, p.boundariesG1, [
    { binding: 0, resource: { buffer: f.walls } },
    { binding: 1, resource: { buffer: f.vel.read } },
    { binding: 2, resource: { buffer: f.oxygen.read } },
    { binding: 3, resource: { buffer: f.temperature.read } },
  ]);
}

export function buildCombustion(p: SimPipelines, f: SimFields): GPUBindGroup {
  return bg2(p.device, p.combustionG1, [
    { binding: 0, resource: { buffer: f.walls } },
    { binding: 1, resource: { buffer: f.vel.read } },
    { binding: 2, resource: { buffer: f.temperature.read } },
    { binding: 3, resource: { buffer: f.fuel.read } },
    { binding: 4, resource: { buffer: f.smoke.read } },
    { binding: 5, resource: { buffer: f.oxygen.read } },
    { binding: 6, resource: { buffer: f.divSource } },
  ]);
}

export function buildDissipate(p: SimPipelines, f: SimFields): GPUBindGroup {
  return bg2(p.device, p.dissipateG1, [
    { binding: 0, resource: { buffer: f.walls } },
    { binding: 1, resource: { buffer: f.temperature.read } },
    { binding: 2, resource: { buffer: f.fuel.read } },
    { binding: 3, resource: { buffer: f.smoke.read } },
    { binding: 4, resource: { buffer: f.oxygen.read } },
  ]);
}

export function buildBlit(p: SimPipelines, f: SimFields): [GPUBindGroup, GPUBindGroup] {
  const d = p.device;
  return [
    bg2(d, p.blitG1, [
      { binding: 0, resource: { buffer: f.walls } },
      { binding: 1, resource: { buffer: f.temperature.read } },
      { binding: 2, resource: { buffer: f.fuel.read } },
      { binding: 3, resource: { buffer: f.smoke.read } },
      { binding: 4, resource: { buffer: f.oxygen.read } },
    ]),
    bg2(d, p.blitG2, [{ binding: 0, resource: f.displayView }]),
  ];
}
