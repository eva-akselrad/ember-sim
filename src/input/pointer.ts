import { SIM } from '../sim/constants';

export interface PointerState {
  gridX: number;
  gridY: number;
  mouseVelX: number;
  mouseVelY: number;
  isDown: boolean;
  onStrokeStart: (() => void) | null;
}

export function createPointerState(canvas: HTMLCanvasElement): PointerState {
  const state: PointerState = {
    gridX: -1,
    gridY: -1,
    mouseVelX: 0,
    mouseVelY: 0,
    isDown: false,
    onStrokeStart: null,
  };

  let lastX = 0;
  let lastY = 0;

  const toGrid = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    return {
      x: nx * (SIM.GRID - 1),
      y: ny * (SIM.GRID - 1),
    };
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    state.isDown = true;
    const g = toGrid(e.clientX, e.clientY);
    state.gridX = g.x;
    state.gridY = g.y;
    lastX = e.clientX;
    lastY = e.clientY;
    state.mouseVelX = 0;
    state.mouseVelY = 0;
    state.onStrokeStart?.();
    e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    const g = toGrid(e.clientX, e.clientY);
    state.gridX = g.x;
    state.gridY = g.y;
    if (state.isDown) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const scale = 2 / Math.max(canvas.clientWidth, canvas.clientHeight);
      state.mouseVelX = Math.max(-2, Math.min(2, dx * scale));
      state.mouseVelY = Math.max(-2, Math.min(2, -dy * scale));
    }
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    state.isDown = false;
    state.mouseVelX = 0;
    state.mouseVelY = 0;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return state;
}
