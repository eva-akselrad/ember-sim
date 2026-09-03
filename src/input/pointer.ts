import { SIM } from '../sim/constants';

export interface PointerState {
  gridX: number;
  gridY: number;
  mouseVelX: number;
  mouseVelY: number;
  isDown: boolean;
}

export function createPointerState(canvas: HTMLCanvasElement): PointerState {
  const state: PointerState = {
    gridX: -1,
    gridY: -1,
    mouseVelX: 0,
    mouseVelY: 0,
    isDown: false,
  };

  let lastX = 0;
  let lastY = 0;

  const toGrid = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    return {
      x: Math.floor(nx * SIM.GRID),
      y: Math.floor(ny * SIM.GRID),
    };
  };

  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    state.isDown = true;
    const g = toGrid(e.clientX, e.clientY);
    state.gridX = g.x;
    state.gridY = g.y;
    lastX = e.clientX;
    lastY = e.clientY;
    state.mouseVelX = 0;
    state.mouseVelY = 0;
  };

  const onMove = (e: PointerEvent) => {
    const g = toGrid(e.clientX, e.clientY);
    state.gridX = g.x;
    state.gridY = g.y;
    if (state.isDown) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      state.mouseVelX = (dx / canvas.clientWidth) * 10;
      state.mouseVelY = -(dy / canvas.clientHeight) * 10;
    }
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onUp = () => {
    state.isDown = false;
    state.mouseVelX = 0;
    state.mouseVelY = 0;
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  return state;
}
