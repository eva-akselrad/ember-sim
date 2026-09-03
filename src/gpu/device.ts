export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export async function initGpu(canvas: HTMLCanvasElement): Promise<GpuContext> {
  if (!navigator.gpu) {
    throw new Error('WebGPU required — please use Chrome or Edge');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No WebGPU adapter found');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message);
    const errorEl = document.getElementById('error');
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = `WebGPU device lost: ${info.message}`;
    }
  });

  return { device, context, format };
}
