import {
  BrushMode,
  SIM,
  VizMode,
  burnSecondsForType,
  customBurnRateFromSeconds,
  formatBurnDuration,
} from '../sim/constants';
import { FuelType } from '../sim/constants';

export interface HudState {
  brushMode: BrushMode;
  vizMode: VizMode;
  brushRadius: number;
  brushStrength: number;
  paused: boolean;
  customBurnSeconds: number;
  customInfinite: boolean;
}

function updateCustomFuelLabel(hud: HTMLElement, state: HudState): void {
  const label = hud.querySelector('#custom-burn-label') as HTMLElement;
  if (!label) return;
  if (state.customInfinite) {
    label.textContent = 'Burn time: Infinite';
    return;
  }
  const secs = state.customBurnSeconds;
  label.textContent = `Burn time: ${formatBurnDuration(secs)} per cell`;
}

function setCustomPanelVisible(hud: HTMLElement, visible: boolean): void {
  const panel = hud.querySelector('#custom-fuel-panel') as HTMLElement;
  if (panel) panel.hidden = !visible;
}

export function createHud(onReset: () => void): HudState {
  const hud = document.getElementById('hud')!;
  const state: HudState = {
    brushMode: BrushMode.Fire,
    vizMode: VizMode.Beauty,
    brushRadius: 14,
    brushStrength: 1.4,
    paused: false,
    customBurnSeconds: SIM.CUSTOM_BURN_DEFAULT,
    customInfinite: false,
  };

  hud.innerHTML = `
    <div class="hud-panel">
      <div class="hud-title">ember-sim <span class="wip-badge">WIP</span></div>
      <div class="hud-wip">Heavily experimental — physics &amp; visuals still in flux</div>
      <div class="hud-help">Wood ~${formatBurnDuration(SIM.FUEL_DENSITY / SIM.WOOD_BURN_RATE)} · Coal ~${formatBurnDuration(SIM.FUEL_DENSITY / SIM.COAL_BURN_RATE)} per cell</div>
      <div class="hud-row">
        <span class="label">Brush</span>
        <button data-mode="7" class="active">Fire</button>
        <button data-mode="8">Fireball</button>
        <button data-mode="1">Wood</button>
        <button data-mode="9">Coal</button>
        <button data-mode="10">Custom</button>
        <button data-mode="2">Heat</button>
        <button data-mode="3">Wall</button>
        <button data-mode="5">Vent</button>
        <button data-mode="4">Erase</button>
        <button data-mode="6">O₂</button>
      </div>
      <div id="custom-fuel-panel" class="hud-subpanel" hidden>
        <div id="custom-burn-label" class="hud-burn-label">Burn time: 45s per cell</div>
        <div class="hud-row">
          <label>Duration <input type="range" id="burn-duration" min="${SIM.CUSTOM_BURN_MIN}" max="${SIM.CUSTOM_BURN_MAX}" value="${SIM.CUSTOM_BURN_DEFAULT}"></label>
          <label class="check"><input type="checkbox" id="burn-infinite"> Infinite</label>
        </div>
      </div>
      <div class="hud-row">
        <span class="label">Viz</span>
        <button data-viz="0" class="active">Beauty</button>
        <button data-viz="1">Oxygen</button>
        <button data-viz="2">Temp</button>
        <button data-viz="3">Fuel</button>
        <button data-viz="4">Smoke</button>
      </div>
      <div class="hud-row">
        <label>Radius <input type="range" id="radius" min="2" max="36" value="14"></label>
        <label>Strength <input type="range" id="strength" min="0.2" max="3" step="0.1" value="1.4"></label>
      </div>
      <div class="hud-row">
        <button id="pause">Pause</button>
        <button id="reset">Clear all</button>
      </div>
    </div>
  `;

  const onBrushChange = (mode: BrushMode) => {
    state.brushMode = mode;
    setCustomPanelVisible(hud, mode === BrushMode.Custom);
  };

  hud.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hud.querySelectorAll('[data-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onBrushChange(Number((btn as HTMLElement).dataset.mode) as BrushMode);
    });
  });

  hud.querySelectorAll('[data-viz]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hud.querySelectorAll('[data-viz]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.vizMode = Number((btn as HTMLElement).dataset.viz) as VizMode;
    });
  });

  const radiusInput = hud.querySelector('#radius') as HTMLInputElement;
  radiusInput.addEventListener('input', () => {
    state.brushRadius = Number(radiusInput.value);
  });

  const strengthInput = hud.querySelector('#strength') as HTMLInputElement;
  strengthInput.addEventListener('input', () => {
    state.brushStrength = Number(strengthInput.value);
  });

  const burnDuration = hud.querySelector('#burn-duration') as HTMLInputElement;
  burnDuration.addEventListener('input', () => {
    state.customBurnSeconds = Number(burnDuration.value);
    updateCustomFuelLabel(hud, state);
  });

  const burnInfinite = hud.querySelector('#burn-infinite') as HTMLInputElement;
  burnInfinite.addEventListener('change', () => {
    state.customInfinite = burnInfinite.checked;
    burnDuration.disabled = state.customInfinite;
    updateCustomFuelLabel(hud, state);
  });

  const pauseBtn = hud.querySelector('#pause') as HTMLButtonElement;
  pauseBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  });

  hud.querySelector('#reset')!.addEventListener('click', onReset);
  updateCustomFuelLabel(hud, state);

  return state;
}

export { burnSecondsForType, customBurnRateFromSeconds, FuelType };
