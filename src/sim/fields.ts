import { N, SIM } from './constants';
import type { CpuSimState } from './brushStamp';

function bufferStorageUsage(): GPUBufferUsageFlags {
  return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
}

function textureDisplayUsage(): GPUTextureUsageFlags {
  return (
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.STORAGE_BINDING |
    GPUTextureUsage.COPY_DST
  );
}

export class PingPong {
  a: GPUBuffer;
  b: GPUBuffer;
  read: GPUBuffer;
  write: GPUBuffer;

  constructor(device: GPUDevice, byteSize: number) {
    const usage = bufferStorageUsage();
    this.a = device.createBuffer({ size: byteSize, usage });
    this.b = device.createBuffer({ size: byteSize, usage });
    this.read = this.a;
    this.write = this.b;
  }

  swap(): void {
    const tmp = this.read;
    this.read = this.write;
    this.write = tmp;
  }
}

function writeBoth(device: GPUDevice, a: GPUBuffer, b: GPUBuffer, data: Float32Array): void {
  device.queue.writeBuffer(a, 0, data);
  device.queue.writeBuffer(b, 0, data);
}

async function readBuffer(device: GPUDevice, src: GPUBuffer, floats: number): Promise<Float32Array> {
  const byteSize = floats * 4;
  const staging = device.createBuffer({
    size: byteSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(src, 0, staging, 0, byteSize);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const copy = new Float32Array(floats);
  copy.set(new Float32Array(staging.getMappedRange()));
  staging.unmap();
  staging.destroy();
  return copy;
}

export class SimFields {
  vel: PingPong;
  pressure: PingPong;
  temperature: PingPong;
  fuel: PingPong;
  smoke: PingPong;
  oxygen: PingPong;
  divergence: GPUBuffer;
  divSource: GPUBuffer;
  walls: GPUBuffer;
  displayTexture: GPUTexture;
  displayView: GPUTextureView;
  cpu: CpuSimState;

  constructor(device: GPUDevice, cpu: CpuSimState) {
    this.cpu = cpu;
    const scalarBytes = N * 4;
    const vec2Bytes = N * 8;

    this.vel = new PingPong(device, vec2Bytes);
    this.pressure = new PingPong(device, scalarBytes);
    this.temperature = new PingPong(device, scalarBytes);
    this.fuel = new PingPong(device, scalarBytes);
    this.smoke = new PingPong(device, scalarBytes);
    this.oxygen = new PingPong(device, scalarBytes);
    this.divergence = device.createBuffer({ size: scalarBytes, usage: bufferStorageUsage() });
    this.divSource = device.createBuffer({ size: scalarBytes, usage: bufferStorageUsage() });
    this.walls = device.createBuffer({ size: scalarBytes, usage: bufferStorageUsage() });

    this.displayTexture = device.createTexture({
      size: [SIM.GRID, SIM.GRID],
      format: 'rgba8unorm',
      usage: textureDisplayUsage(),
    });
    this.displayView = this.displayTexture.createView();

    this.uploadScalars(device);
    const zeros = new Float32Array(N);
    writeBoth(device, this.pressure.a, this.pressure.b, zeros);
    device.queue.writeBuffer(this.divergence, 0, zeros);
    device.queue.writeBuffer(this.divSource, 0, zeros);
  }

  uploadScalars(device: GPUDevice): void {
    const { fuel, temperature, smoke, oxygen, walls, vel } = this.cpu;
    writeBoth(device, this.fuel.a, this.fuel.b, fuel);
    writeBoth(device, this.temperature.a, this.temperature.b, temperature);
    writeBoth(device, this.smoke.a, this.smoke.b, smoke);
    writeBoth(device, this.oxygen.a, this.oxygen.b, oxygen);
    device.queue.writeBuffer(this.walls, 0, walls);
    writeBoth(device, this.vel.a, this.vel.b, vel);
    this.fuel.read = this.fuel.a;
    this.fuel.write = this.fuel.b;
    this.temperature.read = this.temperature.a;
    this.temperature.write = this.temperature.b;
    this.smoke.read = this.smoke.a;
    this.smoke.write = this.smoke.b;
    this.oxygen.read = this.oxygen.a;
    this.oxygen.write = this.oxygen.b;
    this.vel.read = this.vel.a;
    this.vel.write = this.vel.b;
  }

  async syncFromGpu(device: GPUDevice): Promise<void> {
    const [fuel, temperature, smoke, oxygen, walls, vel] = await Promise.all([
      readBuffer(device, this.fuel.read, N),
      readBuffer(device, this.temperature.read, N),
      readBuffer(device, this.smoke.read, N),
      readBuffer(device, this.oxygen.read, N),
      readBuffer(device, this.walls, N),
      readBuffer(device, this.vel.read, N * 2),
    ]);
    this.cpu.fuel.set(fuel);
    this.cpu.temperature.set(temperature);
    this.cpu.smoke.set(smoke);
    this.cpu.oxygen.set(oxygen);
    this.cpu.walls.set(walls);
    this.cpu.vel.set(vel);
  }

  setCpuScalars(
    fuel: Float32Array,
    temperature: Float32Array,
    smoke: Float32Array,
    oxygen: Float32Array,
    walls: Float32Array,
    vel: Float32Array,
    device: GPUDevice,
  ): void {
    this.cpu.fuel.set(fuel);
    this.cpu.temperature.set(temperature);
    this.cpu.smoke.set(smoke);
    this.cpu.oxygen.set(oxygen);
    this.cpu.walls.set(walls);
    this.cpu.vel.set(vel);
    this.uploadScalars(device);
    const zeros = new Float32Array(N);
    writeBoth(device, this.pressure.a, this.pressure.b, zeros);
    device.queue.writeBuffer(this.divergence, 0, zeros);
    device.queue.writeBuffer(this.divSource, 0, zeros);
  }
}
