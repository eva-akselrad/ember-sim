import { N } from './stam/fluid';

export interface PointerState {
  gx: number;
  gy: number;
  vx: number;
  vy: number;
  down: boolean;
}

export function attachInput(
  canvas: HTMLCanvasElement,
  gridWidth: number,
  gridHeight: number,
): PointerState {
  const state: PointerState = { gx: -1, gy: -1, vx: 0, vy: 0, down: false };
  let lastX = 0;
  let lastY = 0;

  function toGrid(clientX: number, clientY: number): { gx: number; gy: number } {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * gridWidth;
    const y = ((clientY - rect.top) / rect.height) * gridHeight;
    const gx = Math.round(x / (gridWidth / N));
    const gy = N - Math.round(y / (gridHeight / N)) + 1;
    return { gx, gy };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    state.down = true;
    const { gx, gy } = toGrid(e.clientX, e.clientY);
    state.gx = gx;
    state.gy = gy;
    lastX = e.clientX;
    lastY = e.clientY;
    state.vx = 0;
    state.vy = 0;
  });

  canvas.addEventListener('pointermove', (e) => {
    const { gx, gy } = toGrid(e.clientX, e.clientY);
    state.gx = gx;
    state.gy = gy;
    if (state.down) {
      state.vx = (e.clientX - lastX) * 0.12;
      state.vy = -(e.clientY - lastY) * 0.12;
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });

  canvas.addEventListener('pointerup', () => {
    state.down = false;
    state.vx = 0;
    state.vy = 0;
  });

  canvas.addEventListener('pointercancel', () => {
    state.down = false;
  });

  return state;
}
