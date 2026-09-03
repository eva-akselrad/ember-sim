import './styles.css';
import { webGpuSupportMessage } from './gpu/device';

function showError(message: string): void {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }
  console.error(message);
}

async function main(): Promise<void> {
  const canvas = document.getElementById('gfx') as HTMLCanvasElement | null;
  if (!canvas) {
    showError('Missing canvas element.');
    return;
  }

  const unsupported = webGpuSupportMessage();
  if (unsupported) {
    showError(unsupported);
    return;
  }

  const { initGpu } = await import('./gpu/device');
  const { defaultUniforms } = await import('./gpu/types');
  const { SimFields } = await import('./sim/fields');
  const { SimPipelines } = await import('./sim/pipelines');
  const { encodeSimFrame } = await import('./sim/step');
  const { createPointerState } = await import('./input/pointer');
  const { createHud } = await import('./ui/hud');
  const { applyCampfirePreset } = await import('./sim/preset');
  const { createCpuState, stampBrush } = await import('./sim/brushStamp');

  try {
    const gpu = await initGpu(canvas);
    const cpu = createCpuState();
    const fields = new SimFields(gpu.device, cpu);
    applyCampfirePreset(gpu.device, fields);
    const pipelines = new SimPipelines(gpu.device, gpu.format);
    pipelines.setPresentBindGroup(fields);
    const pointer = createPointerState(canvas);
    const uniforms = defaultUniforms();

    let strokeReady = true;
    let syncGeneration = 0;

    pointer.onStrokeStart = () => {
      const gen = ++syncGeneration;
      strokeReady = false;
      fields.syncFromGpu(gpu.device).then(() => {
        if (gen === syncGeneration) strokeReady = true;
      });
    };

    const hud = createHud(() => {}, () => {
      applyCampfirePreset(gpu.device, fields);
    });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssSize = Math.min(window.innerWidth, window.innerHeight);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      const size = Math.floor(cssSize * dpr);
      canvas.width = size;
      canvas.height = size;
      gpu.context.configure({ device: gpu.device, format: gpu.format, alphaMode: 'opaque' });
    };
    window.addEventListener('resize', resize);
    resize();

    const frame = () => {
      uniforms.brushMode = hud.brushMode;
      uniforms.vizMode = hud.vizMode;
      uniforms.brushRadius = hud.brushRadius;
      uniforms.brushStrength = hud.brushStrength;
      uniforms.brushX = pointer.gridX;
      uniforms.brushY = pointer.gridY;
      uniforms.mouseVelX = pointer.mouseVelX;
      uniforms.mouseVelY = pointer.mouseVelY;
      uniforms.brushActive = 0;

      const painting = pointer.isDown;

      if (painting && strokeReady) {
        stampBrush(
          fields.cpu,
          pointer.gridX,
          pointer.gridY,
          hud.brushRadius,
          hud.brushMode,
          hud.brushStrength,
        );
        fields.uploadScalars(gpu.device);
      }

      if (!hud.paused) {
        const texture = gpu.context.getCurrentTexture();
        encodeSimFrame(gpu.device, pipelines, fields, uniforms, texture.createView());
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
  }
}

main().catch((err) => {
  showError(err instanceof Error ? err.message : String(err));
});
