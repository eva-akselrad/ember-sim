import splatSrc from '../../shaders/splat.wgsl?raw';
import forcesSrc from '../../shaders/forces.wgsl?raw';
import advectVelSrc from '../../shaders/advect_vel.wgsl?raw';
import advectScalarsSrc from '../../shaders/advect_scalars.wgsl?raw';
import divergenceSrc from '../../shaders/divergence.wgsl?raw';
import jacobiSrc from '../../shaders/jacobi.wgsl?raw';
import projectSrc from '../../shaders/project.wgsl?raw';
import boundariesSrc from '../../shaders/boundaries.wgsl?raw';
import combustionSrc from '../../shaders/combustion.wgsl?raw';
import dissipateSrc from '../../shaders/dissipate.wgsl?raw';
import blitSrc from '../../shaders/blit.wgsl?raw';
import presentSrc from '../../shaders/present.wgsl?raw';

import { UNIFORM_SIZE } from '../gpu/types';
import type { SimFields } from './fields';

function makeComputePipeline(
  device: GPUDevice,
  code: string,
  layouts: GPUBindGroupLayout[],
): GPUComputePipeline {
  return device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
    compute: { module: device.createShaderModule({ code }), entryPoint: 'main' },
  });
}

export class SimPipelines {
  device: GPUDevice;
  uniformBuffer: GPUBuffer;
  uniformLayout: GPUBindGroupLayout;
  uniformBindGroup: GPUBindGroup;

  splat: GPUComputePipeline;
  forces: GPUComputePipeline;
  advectVel: GPUComputePipeline;
  advectScalars: GPUComputePipeline;
  divergence: GPUComputePipeline;
  jacobi: GPUComputePipeline;
  project: GPUComputePipeline;
  boundaries: GPUComputePipeline;
  combustion: GPUComputePipeline;
  dissipate: GPUComputePipeline;
  blit: GPUComputePipeline;
  present: GPURenderPipeline;
  presentBindGroup!: GPUBindGroup;

  sampler: GPUSampler;

  // layouts reused for bind group creation
  splatG1: GPUBindGroupLayout;
  forcesG1: GPUBindGroupLayout;
  forcesG2: GPUBindGroupLayout;
  advectVelG1: GPUBindGroupLayout;
  advectVelG2: GPUBindGroupLayout;
  advectScalarsG1: GPUBindGroupLayout;
  advectScalarsG2: GPUBindGroupLayout;
  divergenceG1: GPUBindGroupLayout;
  divergenceG2: GPUBindGroupLayout;
  jacobiG1: GPUBindGroupLayout;
  jacobiG2: GPUBindGroupLayout;
  projectG1: GPUBindGroupLayout;
  projectG2: GPUBindGroupLayout;
  boundariesG1: GPUBindGroupLayout;
  combustionG1: GPUBindGroupLayout;
  dissipateG1: GPUBindGroupLayout;
  blitG1: GPUBindGroupLayout;
  blitG2: GPUBindGroupLayout;
  presentLayout: GPUBindGroupLayout;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;

    this.uniformLayout = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
    });
    this.uniformBuffer = device.createBuffer({ size: UNIFORM_SIZE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.uniformBindGroup = device.createBindGroup({
      layout: this.uniformLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    const storageR = { buffer: { type: 'read-only-storage' as const } };
    const storageRW = { buffer: { type: 'storage' as const } };

    this.splatG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, ...storageRW },
      ],
    });

    this.forcesG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.forcesG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
    });

    this.advectVelG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.advectVelG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
    });

    this.advectScalarsG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.advectScalarsG2 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageRW },
      ],
    });

    this.divergenceG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.divergenceG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
    });

    this.jacobiG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.jacobiG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
    });

    this.projectG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.projectG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
    });

    this.boundariesG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageRW },
      ],
    });

    this.combustionG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, ...storageRW },
      ],
    });

    this.dissipateG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageRW },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, ...storageRW },
      ],
    });

    this.blitG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.blitG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba8unorm', viewDimension: '2d' } }],
    });

    this.presentLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      ],
    });

    const uLayout = this.uniformLayout;
    this.splat = makeComputePipeline(device, splatSrc, [uLayout, this.splatG1]);
    this.forces = makeComputePipeline(device, forcesSrc, [uLayout, this.forcesG1, this.forcesG2]);
    this.advectVel = makeComputePipeline(device, advectVelSrc, [uLayout, this.advectVelG1, this.advectVelG2]);
    this.advectScalars = makeComputePipeline(device, advectScalarsSrc, [uLayout, this.advectScalarsG1, this.advectScalarsG2]);
    this.divergence = makeComputePipeline(device, divergenceSrc, [uLayout, this.divergenceG1, this.divergenceG2]);
    this.jacobi = makeComputePipeline(device, jacobiSrc, [uLayout, this.jacobiG1, this.jacobiG2]);
    this.project = makeComputePipeline(device, projectSrc, [uLayout, this.projectG1, this.projectG2]);
    this.boundaries = makeComputePipeline(device, boundariesSrc, [uLayout, this.boundariesG1]);
    this.combustion = makeComputePipeline(device, combustionSrc, [uLayout, this.combustionG1]);
    this.dissipate = makeComputePipeline(device, dissipateSrc, [uLayout, this.dissipateG1]);
    this.blit = makeComputePipeline(device, blitSrc, [uLayout, this.blitG1, this.blitG2]);

    this.present = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.presentLayout] }),
      vertex: { module: device.createShaderModule({ code: presentSrc }), entryPoint: 'vs' },
      fragment: { module: device.createShaderModule({ code: presentSrc }), entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  }

  setPresentBindGroup(fields: SimFields): void {
    this.presentBindGroup = this.device.createBindGroup({
      layout: this.presentLayout,
      entries: [
        { binding: 0, resource: fields.displayView },
        { binding: 1, resource: this.sampler },
      ],
    });
  }
}
