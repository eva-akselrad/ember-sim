import { DISPATCH, SIM } from './constants';
import type { SimFields } from './fields';
import {
  buildAdvectScalars,
  buildAdvectVel,
  buildBlit,
  buildBoundaries,
  buildCombustion,
  buildDissipate,
  buildDivergence,
  buildForces,
  buildJacobi,
  buildProject,
} from './frameBindGroups';
import type { SimPipelines } from './pipelines';
import { packUniforms, type SimUniformData } from '../gpu/types';

function dispatch(pass: GPUComputePassEncoder, pipeline: GPUComputePipeline, groups: GPUBindGroup[]): void {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, groups[0]);
  for (let i = 1; i < groups.length; i++) {
    pass.setBindGroup(i, groups[i]);
  }
  pass.dispatchWorkgroups(DISPATCH, DISPATCH);
}

export function encodeSimFrame(
  device: GPUDevice,
  pipelines: SimPipelines,
  fields: SimFields,
  uniforms: SimUniformData,
  canvasTextureView: GPUTextureView,
): void {
  device.queue.writeBuffer(pipelines.uniformBuffer, 0, packUniforms(uniforms));

  const encoder = device.createCommandEncoder();
  const compute = encoder.beginComputePass();
  const u = pipelines.uniformBindGroup;

  dispatch(compute, pipelines.forces, [u, ...buildForces(pipelines, fields)]);
  dispatch(compute, pipelines.advectVel, [u, ...buildAdvectVel(pipelines, fields)]);
  fields.vel.swap();

  dispatch(compute, pipelines.divergence, [u, ...buildDivergence(pipelines, fields)]);
  for (let i = 0; i < SIM.JACOBI_ITERS; i++) {
    dispatch(compute, pipelines.jacobi, [u, ...buildJacobi(pipelines, fields)]);
    fields.pressure.swap();
  }

  dispatch(compute, pipelines.project, [u, ...buildProject(pipelines, fields)]);
  dispatch(compute, pipelines.advectScalars, [u, ...buildAdvectScalars(pipelines, fields)]);
  fields.temperature.swap();
  fields.fuel.swap();
  fields.smoke.swap();
  fields.oxygen.swap();

  dispatch(compute, pipelines.boundaries, [u, buildBoundaries(pipelines, fields)]);
  dispatch(compute, pipelines.combustion, [u, buildCombustion(pipelines, fields)]);
  dispatch(compute, pipelines.dissipate, [u, buildDissipate(pipelines, fields)]);

  dispatch(compute, pipelines.blit, [u, ...buildBlit(pipelines, fields)]);
  compute.end();

  const render = encoder.beginRenderPass({
    colorAttachments: [{
      view: canvasTextureView,
      clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  render.setPipeline(pipelines.present);
  render.setBindGroup(0, pipelines.presentBindGroup);
  render.draw(3);
  render.end();

  device.queue.submit([encoder.finish()]);
}
