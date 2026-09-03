export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export function webGpuSupportMessage(): string | null {
  if (!navigator.gpu) {
    const isFirefox = navigator.userAgent.includes('Firefox');
    if (isFirefox) {
      return [
        'WebGPU is not available in this Firefox build.',
        '',
        'On Windows: update to Firefox 141 or newer (WebGPU ships enabled).',
        'On macOS / Linux: open about:config and set dom.webgpu.enabled to true.',
        'If your GPU is blocklisted, also set gfx.webgpu.ignore-blocklist to true.',
        '',
        'Then restart Firefox and reload this page.',
      ].join('\n');
    }
    return [
      'WebGPU is not available in this browser.',
      '',
      'Use a recent Chrome, Edge, or Firefox with WebGPU enabled.',
      'Make sure hardware acceleration is on in browser settings.',
    ].join('\n');
  }
  return null;
}

export async function initGpu(canvas: HTMLCanvasElement): Promise<GpuContext> {
  const unsupported = webGpuSupportMessage();
  if (unsupported) {
    throw new Error(unsupported);
  }

  const adapter = await navigator.gpu!.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) {
    throw new Error(
      'No WebGPU GPU adapter found. Try updating graphics drivers and enabling hardware acceleration in your browser settings.',
    );
  }

  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`WebGPU device request failed: ${detail}`);
  }

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to get WebGPU canvas context');
  }

  const format = navigator.gpu!.getPreferredCanvasFormat();
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
