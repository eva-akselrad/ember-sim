import './styles.css';
import { initGpu } from './gpu/device';
import { defaultUniforms } from './gpu/types';
import { SimFields } from './sim/fields';
import { SimPipelines } from './sim/pipelines';
import { encodeSimFrame } from './sim/step';
import { createPointerState } from './input/pointer';
import { createHud } from './ui/hud';

async function main(): Promise<void> {
  const canvas = document.getElementById('gfx') as HTMLCanvasElement;
  const errorEl = document.getElementById('error')!;

  try {
    const gpu = await initGpu(canvas);
    const fields = new SimFields(gpu.device);
    const pipelines = new SimPipelines(gpu.device, gpu.format);
    const pointer = createPointerState(canvas);
    const uniforms = defaultUniforms();

    const hud = createHud(() => {}, () => {
      fields.clear(gpu.device);
    });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
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
      uniforms.brushActive = pointer.isDown ? 1 : 0;

      if (!hud.paused) {
        const texture = gpu.context.getCurrentTexture();
        encodeSimFrame(gpu.device, pipelines, fields, uniforms, texture.createView());
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  } catch (err) {
    errorEl.hidden = false;
    errorEl.textContent = err instanceof Error ? err.message : String(err);
    console.error(err);
  }
}

main();
