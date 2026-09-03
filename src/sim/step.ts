import { DISPATCH, SIM } from './constants';
import type { SimFields } from './fields';
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

  // 1. Brush splat
  if (uniforms.brushActive > 0.5) {
    dispatch(compute, pipelines.splat, [
      pipelines.uniformBindGroup,
      pipelines.createSplatBindGroup(fields),
    ]);
  }

  // 2. Forces (buoyancy)
  const [forcesG1, forcesG2] = pipelines.createForcesBindGroups(fields);
  dispatch(compute, pipelines.forces, [pipelines.uniformBindGroup, forcesG1, forcesG2]);

  // 3. Advect velocity
  const [advVelG1, advVelG2] = pipelines.createAdvectVelBindGroups(fields);
  dispatch(compute, pipelines.advectVel, [pipelines.uniformBindGroup, advVelG1, advVelG2]);
  fields.vel.swap();

  // 4. Divergence (uses divSource from previous frame combustion)
  const [divG1, divG2] = pipelines.createDivergenceBindGroups(fields);
  dispatch(compute, pipelines.divergence, [pipelines.uniformBindGroup, divG1, divG2]);

  // 5. Jacobi pressure solve
  for (let i = 0; i < SIM.JACOBI_ITERS; i++) {
    const [jacG1, jacG2] = pipelines.createJacobiBindGroups(fields);
    dispatch(compute, pipelines.jacobi, [pipelines.uniformBindGroup, jacG1, jacG2]);
    fields.pressure.swap();
  }

  // 6. Project velocity
  const [projG1, projG2] = pipelines.createProjectBindGroups(fields);
  dispatch(compute, pipelines.project, [pipelines.uniformBindGroup, projG1, projG2]);

  // 7. Advect scalars
  const advectScalar = (read: GPUBuffer, write: GPUBuffer) => {
    const [g1, g2] = pipelines.createAdvectScalarBindGroups(fields, read, write);
    dispatch(compute, pipelines.advectScalar, [pipelines.uniformBindGroup, g1, g2]);
  };

  advectScalar(fields.temperature.read, fields.temperature.write);
  fields.temperature.swap();
  advectScalar(fields.fuel.read, fields.fuel.write);
  fields.fuel.swap();
  advectScalar(fields.smoke.read, fields.smoke.write);
  fields.smoke.swap();
  advectScalar(fields.oxygen.read, fields.oxygen.write);
  fields.oxygen.swap();

  // 8. Diffuse oxygen
  const [diffG1, diffG2] = pipelines.createDiffuseO2BindGroups(fields);
  dispatch(compute, pipelines.diffuseO2, [pipelines.uniformBindGroup, diffG1, diffG2]);
  fields.oxygen.swap();

  // 9. Boundaries (open edges refill O2)
  dispatch(compute, pipelines.boundaries, [
    pipelines.uniformBindGroup,
    pipelines.createBoundariesBindGroup(fields),
  ]);

  // 10. Combustion (writes divSource for next frame)
  dispatch(compute, pipelines.combustion, [
    pipelines.uniformBindGroup,
    pipelines.createCombustionBindGroup(fields),
  ]);

  // 11. Dissipate
  dispatch(compute, pipelines.dissipate, [
    pipelines.uniformBindGroup,
    pipelines.createDissipateBindGroup(fields),
  ]);

  // 12. Blit to display texture
  const [blitG1, blitG2] = pipelines.createBlitBindGroups(fields);
  dispatch(compute, pipelines.blit, [pipelines.uniformBindGroup, blitG1, blitG2]);

  compute.end();

  // 13. Present to canvas
  const presentBindGroup = pipelines.createPresentBindGroup(fields);
  const render = encoder.beginRenderPass({
    colorAttachments: [{
      view: canvasTextureView,
      clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  render.setPipeline(pipelines.present);
  render.setBindGroup(0, presentBindGroup);
  render.draw(3);
  render.end();

  device.queue.submit([encoder.finish()]);
}
