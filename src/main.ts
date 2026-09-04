import './styles.css';
import { BrushMode, SIM } from './sim/constants';
import { FireSim } from './sim/fire';
import { attachInput } from './input';
import { createRenderer } from './render';
import { createHud } from './ui/hud';
import { attachBrushCursor } from './brushCursor';

function main(): void {
  const canvas = document.getElementById('gfx') as HTMLCanvasElement | null;
  if (!canvas) return;

  const sim = new FireSim();
  sim.clear();
  const renderer = createRenderer(canvas);
  const pointer = attachInput(canvas, renderer.width, renderer.height);
  const hud = createHud(() => sim.clear());

  const brushRadius = () =>
    hud.brushMode === BrushMode.Fireball ? hud.brushRadius * 2 : hud.brushRadius;

  attachBrushCursor(canvas, brushRadius);

  const loop = (): void => {
    if (pointer.down && pointer.gx >= 1 && pointer.gy >= 1) {
      const radius = brushRadius();
      const strength = hud.brushMode === BrushMode.Fireball ? hud.brushStrength * 2.5 : hud.brushStrength;
      sim.splatBrush(
        pointer.gx,
        pointer.gy,
        radius,
        hud.brushMode,
        strength,
        pointer.vx * 8,
        pointer.vy * 8,
        hud.customBurnSeconds,
        hud.customInfinite,
      );
    }

    if (!hud.paused) {
      sim.step(SIM.DT);
    }

    renderer.draw(sim, hud.vizMode);
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

main();
