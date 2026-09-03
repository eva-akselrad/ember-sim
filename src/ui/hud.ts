import { BrushMode, VizMode } from '../sim/constants';

export interface HudState {
  brushMode: BrushMode;
  vizMode: VizMode;
  brushRadius: number;
  brushStrength: number;
  paused: boolean;
  onClear: () => void;
}

export function createHud(onChange: () => void, onClear: () => void): HudState {
  const hud = document.getElementById('hud')!;
  const state: HudState = {
    brushMode: BrushMode.Fire,
    vizMode: VizMode.Beauty,
    brushRadius: 16,
    brushStrength: 1.5,
    paused: false,
    onClear,
  };

  hud.innerHTML = `
    <div class="hud-panel">
      <div class="hud-title">ember-sim</div>
      <div class="hud-help">Campfire starts lit. Use Beauty viz. Drag Fire to paint more.</div>
      <div class="hud-row">
        <span class="label">Brush</span>
        <button data-mode="7" class="active">Fire</button>
        <button data-mode="1">Fuel</button>
        <button data-mode="2">Heat</button>
        <button data-mode="3">Wall</button>
        <button data-mode="5">Vent</button>
        <button data-mode="4">Erase</button>
        <button data-mode="6">O₂</button>
      </div>
      <div class="hud-row">
        <span class="label">Viz</span>
        <button data-viz="0" class="active">Beauty</button>
        <button data-viz="1">Oxygen</button>
        <button data-viz="2">Temp</button>
        <button data-viz="3">Fuel</button>
      </div>
      <div class="hud-row">
        <label>Radius <input type="range" id="radius" min="2" max="40" value="16"></label>
        <label>Strength <input type="range" id="strength" min="0.2" max="3" step="0.1" value="1.5"></label>
      </div>
      <div class="hud-row">
        <button id="pause">Pause</button>
        <button id="clear">Reset fire</button>
      </div>
    </div>
  `;

  hud.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hud.querySelectorAll('[data-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.brushMode = Number((btn as HTMLElement).dataset.mode) as BrushMode;
      onChange();
    });
  });

  hud.querySelectorAll('[data-viz]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hud.querySelectorAll('[data-viz]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.vizMode = Number((btn as HTMLElement).dataset.viz) as VizMode;
      onChange();
    });
  });

  const radiusInput = hud.querySelector('#radius') as HTMLInputElement;
  radiusInput.addEventListener('input', () => {
    state.brushRadius = Number(radiusInput.value);
    onChange();
  });

  const strengthInput = hud.querySelector('#strength') as HTMLInputElement;
  strengthInput.addEventListener('input', () => {
    state.brushStrength = Number(strengthInput.value);
    onChange();
  });

  const pauseBtn = hud.querySelector('#pause') as HTMLButtonElement;
  pauseBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
    onChange();
  });

  hud.querySelector('#clear')!.addEventListener('click', () => {
    onClear();
    onChange();
  });

  return state;
}
