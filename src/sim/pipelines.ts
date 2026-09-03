import splatSrc from '../../shaders/splat.wgsl?raw';
import forcesSrc from '../../shaders/forces.wgsl?raw';
import advectVelSrc from '../../shaders/advect_vel.wgsl?raw';
import advectScalarSrc from '../../shaders/advect_scalar.wgsl?raw';
import divergenceSrc from '../../shaders/divergence.wgsl?raw';
import jacobiSrc from '../../shaders/jacobi.wgsl?raw';
import projectSrc from '../../shaders/project.wgsl?raw';
import diffuseO2Src from '../../shaders/diffuse_o2.wgsl?raw';
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
  advectScalar: GPUComputePipeline;
  divergence: GPUComputePipeline;
  jacobi: GPUComputePipeline;
  project: GPUComputePipeline;
  diffuseO2: GPUComputePipeline;
  boundaries: GPUComputePipeline;
  combustion: GPUComputePipeline;
  dissipate: GPUComputePipeline;
  blit: GPUComputePipeline;
  present: GPURenderPipeline;

  sampler: GPUSampler;

  // layouts reused for bind group creation
  splatG1: GPUBindGroupLayout;
  forcesG1: GPUBindGroupLayout;
  forcesG2: GPUBindGroupLayout;
  advectVelG1: GPUBindGroupLayout;
  advectVelG2: GPUBindGroupLayout;
  advectScalarG1: GPUBindGroupLayout;
  advectScalarG2: GPUBindGroupLayout;
  divergenceG1: GPUBindGroupLayout;
  divergenceG2: GPUBindGroupLayout;
  jacobiG1: GPUBindGroupLayout;
  jacobiG2: GPUBindGroupLayout;
  projectG1: GPUBindGroupLayout;
  projectG2: GPUBindGroupLayout;
  diffuseO2G1: GPUBindGroupLayout;
  diffuseO2G2: GPUBindGroupLayout;
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

    this.advectScalarG1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.advectScalarG2 = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageRW }],
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

    this.diffuseO2G1 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, ...storageR },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, ...storageR },
      ],
    });
    this.diffuseO2G2 = device.createBindGroupLayout({
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
    this.advectScalar = makeComputePipeline(device, advectScalarSrc, [uLayout, this.advectScalarG1, this.advectScalarG2]);
    this.divergence = makeComputePipeline(device, divergenceSrc, [uLayout, this.divergenceG1, this.divergenceG2]);
    this.jacobi = makeComputePipeline(device, jacobiSrc, [uLayout, this.jacobiG1, this.jacobiG2]);
    this.project = makeComputePipeline(device, projectSrc, [uLayout, this.projectG1, this.projectG2]);
    this.diffuseO2 = makeComputePipeline(device, diffuseO2Src, [uLayout, this.diffuseO2G1, this.diffuseO2G2]);
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

  createPresentBindGroup(fields: SimFields): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.presentLayout,
      entries: [
        { binding: 0, resource: fields.displayView },
        { binding: 1, resource: this.sampler },
      ],
    });
  }

  createSplatBindGroup(f: SimFields): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.splatG1,
      entries: [
        { binding: 0, resource: { buffer: f.walls } },
        { binding: 1, resource: { buffer: f.vel.read } },
        { binding: 2, resource: { buffer: f.temperature.read } },
        { binding: 3, resource: { buffer: f.fuel.read } },
        { binding: 4, resource: { buffer: f.smoke.read } },
        { binding: 5, resource: { buffer: f.oxygen.read } },
      ],
    });
  }

  createForcesBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.forcesG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.temperature.read } },
          { binding: 2, resource: { buffer: f.smoke.read } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.forcesG2,
        entries: [{ binding: 0, resource: { buffer: f.vel.read } }],
      }),
    ];
  }

  createAdvectVelBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.advectVelG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.vel.read } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.advectVelG2,
        entries: [{ binding: 0, resource: { buffer: f.vel.write } }],
      }),
    ];
  }

  createAdvectScalarBindGroups(f: SimFields, scalarRead: GPUBuffer, scalarWrite: GPUBuffer): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.advectScalarG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.vel.read } },
          { binding: 2, resource: { buffer: scalarRead } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.advectScalarG2,
        entries: [{ binding: 0, resource: { buffer: scalarWrite } }],
      }),
    ];
  }

  createDivergenceBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.divergenceG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.vel.read } },
          { binding: 2, resource: { buffer: f.divSource } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.divergenceG2,
        entries: [{ binding: 0, resource: { buffer: f.divergence } }],
      }),
    ];
  }

  createJacobiBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.jacobiG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.pressure.read } },
          { binding: 2, resource: { buffer: f.divergence } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.jacobiG2,
        entries: [{ binding: 0, resource: { buffer: f.pressure.write } }],
      }),
    ];
  }

  createProjectBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.projectG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.pressure.read } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.projectG2,
        entries: [{ binding: 0, resource: { buffer: f.vel.read } }],
      }),
    ];
  }

  createDiffuseO2BindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.diffuseO2G1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.oxygen.read } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.diffuseO2G2,
        entries: [{ binding: 0, resource: { buffer: f.oxygen.write } }],
      }),
    ];
  }

  createBoundariesBindGroup(f: SimFields): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.boundariesG1,
      entries: [
        { binding: 0, resource: { buffer: f.walls } },
        { binding: 1, resource: { buffer: f.vel.read } },
        { binding: 2, resource: { buffer: f.oxygen.read } },
        { binding: 3, resource: { buffer: f.temperature.read } },
      ],
    });
  }

  createCombustionBindGroup(f: SimFields): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.combustionG1,
      entries: [
        { binding: 0, resource: { buffer: f.walls } },
        { binding: 1, resource: { buffer: f.vel.read } },
        { binding: 2, resource: { buffer: f.temperature.read } },
        { binding: 3, resource: { buffer: f.fuel.read } },
        { binding: 4, resource: { buffer: f.smoke.read } },
        { binding: 5, resource: { buffer: f.oxygen.read } },
        { binding: 6, resource: { buffer: f.divSource } },
      ],
    });
  }

  createDissipateBindGroup(f: SimFields): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.dissipateG1,
      entries: [
        { binding: 0, resource: { buffer: f.walls } },
        { binding: 1, resource: { buffer: f.temperature.read } },
        { binding: 2, resource: { buffer: f.fuel.read } },
        { binding: 3, resource: { buffer: f.smoke.read } },
        { binding: 4, resource: { buffer: f.oxygen.read } },
      ],
    });
  }

  createBlitBindGroups(f: SimFields): [GPUBindGroup, GPUBindGroup] {
    return [
      this.device.createBindGroup({
        layout: this.blitG1,
        entries: [
          { binding: 0, resource: { buffer: f.walls } },
          { binding: 1, resource: { buffer: f.temperature.read } },
          { binding: 2, resource: { buffer: f.fuel.read } },
          { binding: 3, resource: { buffer: f.smoke.read } },
          { binding: 4, resource: { buffer: f.oxygen.read } },
        ],
      }),
      this.device.createBindGroup({
        layout: this.blitG2,
        entries: [{ binding: 0, resource: f.displayView }],
      }),
    ];
  }
}
