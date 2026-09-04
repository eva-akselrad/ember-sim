# ember-sim

Browser **fire fluid sandbox** — Jos Stam stable fluids + combustion, inspired by [Escape Motions Fire Fluid 3](https://www.escapemotions.com/experiments/fluid_fire_3/index.php) and [*Real-Time Fluid Dynamics for Games*](https://www.dgp.toronto.edu/people/stam/reality/Research/pdf/GDC03.pdf).

TypeScript + Vite + **Canvas 2D** (CPU solver, 128×128 grid). No WebGPU required.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Hard-refresh after pulling updates (`Ctrl+Shift+R`).

## Controls

| Brush | Action |
|-------|--------|
| **Fire** | Wood fuel + heat + smoke |
| **Fireball** | Large hot burst (best with fuel nearby for sustained burn) |
| **Wood** | Solid fuel (~10 s per cell) |
| **Coal** | Slow-burning fuel (~71 s per cell) |
| **Custom** | Slider 3 s–5 min per cell, or **Infinite** |
| **Heat** | Add temperature |
| **Wall** | Solid barrier — blocks flow and O₂ |
| **Vent** | Remove wall — lets O₂ diffuse in |
| **Erase** | Clear a cell |
| **O₂** | Refill oxygen locally (debug) |

**Viz modes:** Beauty, Oxygen, Temperature, Fuel, Smoke

- Drag while painting to push the fluid.
- Brush size ring follows the cursor.
- **Clear all** resets the canvas (empty scene on load).

## Backdraft demo

1. **Wall** — draw a closed ring or room.
2. **Wood** — paint fuel inside (fireball alone won't reignite; you need fuel embers).
3. **Heat** or **Fire** — ignite.
4. Switch to **Oxygen** viz — O₂ depletes inside; flame dies to dim embers.
5. **Vent** — open a hole in the wall. O₂ creeps in through diffusion; embers flash and backdraft when enough oxygen returns.

O₂ enters sealed rooms gradually (diffusion + vent bleed), not instantly. Edge of the grid stays at ambient O₂.

## Physics (summary)

| Field | Behavior |
|-------|----------|
| **Fuel** | Solid wood/coal — does not advect; blocks flow |
| **Temperature** | Advects in air; conducts through wood; surface heat to air while burning |
| **Smoke** | Advects; darkens the beauty render |
| **O₂** | Advects + diffuses; consumed by combustion; edge refill at grid boundary |
| **Velocity** | Stam projection with wall-aware solids; buoyancy + combustion expansion |

**Combustion** needs fuel + temperature ≥ ignition + local O₂. Wood burns using O₂ from adjacent air cells. When a room is starved, fuel holds ember heat; air cools. **Backdraft** triggers when O₂ recovers after starvation (vent opened) — extra heat, smoke, expansion, and velocity kick.

## Architecture

```
src/stam/fluid.ts    — Stam core (advect, project, diffuse)
src/sim/fire.ts      — FireSim: buoyancy, combustion, O₂, walls, brushes
src/sim/constants.ts — SIM params, fuel types, brush modes
src/render.ts        — Canvas beauty + viz modes
src/ui/hud.ts        — Brush / viz UI
src/input.ts         — Pointer → grid painting
src/brushCursor.ts   — Brush radius overlay
```

**Per frame:** buoyancy → velocity step (project → advect → project) → advect temperature/smoke/O₂ → O₂ diffuse → vent bleed → ember/starve pass → combustion → cooling.

## Build

```bash
npm run build    # dist/
npm run preview  # serve production build
```

## History

v0.3 — Rebuilt on Stam CPU solver (replaced experimental WebGPU path). Solid fuel, fuel types, O₂ starvation, embers, backdraft, fullscreen canvas.

## License

MIT (see repository).
