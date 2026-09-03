import { N, SIM } from './constants';

const STORAGE =
  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

export class PingPong {
  a: GPUBuffer;
  b: GPUBuffer;
  read: GPUBuffer;
  write: GPUBuffer;

  constructor(device: GPUDevice, byteSize: number) {
    this.a = device.createBuffer({ size: byteSize, usage: STORAGE });
    this.b = device.createBuffer({ size: byteSize, usage: STORAGE });
    this.read = this.a;
    this.write = this.b;
  }

  swap(): void {
    const tmp = this.read;
    this.read = this.write;
    this.write = tmp;
  }
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

  constructor(device: GPUDevice) {
    const scalarBytes = N * 4;
    const vec2Bytes = N * 8;

    this.vel = new PingPong(device, vec2Bytes);
    this.pressure = new PingPong(device, scalarBytes);
    this.temperature = new PingPong(device, scalarBytes);
    this.fuel = new PingPong(device, scalarBytes);
    this.smoke = new PingPong(device, scalarBytes);
    this.oxygen = new PingPong(device, scalarBytes);
    this.divergence = device.createBuffer({ size: scalarBytes, usage: STORAGE });
    this.divSource = device.createBuffer({ size: scalarBytes, usage: STORAGE });
    this.walls = device.createBuffer({ size: scalarBytes, usage: STORAGE });

    this.displayTexture = device.createTexture({
      size: [SIM.GRID, SIM.GRID],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST,
    });
    this.displayView = this.displayTexture.createView();

    this.initBuffers(device);
  }

  private initBuffers(device: GPUDevice): void {
    const zeros = new Float32Array(N);
    const oxygen = new Float32Array(N).fill(SIM.O2_AMBIENT);
    const velZeros = new Float32Array(N * 2);

    const write = (buf: GPUBuffer, data: Float32Array) => {
      device.queue.writeBuffer(buf, 0, data);
    };

    write(this.vel.a, velZeros);
    write(this.vel.b, velZeros);
    write(this.pressure.a, zeros);
    write(this.pressure.b, zeros);
    write(this.temperature.a, zeros);
    write(this.temperature.b, zeros);
    write(this.fuel.a, zeros);
    write(this.fuel.b, zeros);
    write(this.smoke.a, zeros);
    write(this.smoke.b, zeros);
    write(this.oxygen.a, oxygen);
    write(this.oxygen.b, oxygen);
    write(this.divergence, zeros);
    write(this.divSource, zeros);
    write(this.walls, zeros);
  }

  clear(device: GPUDevice): void {
    this.initBuffers(device);
  }
}
