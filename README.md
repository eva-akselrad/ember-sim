# ember-sim

> **⚠️ Project retired — unfinished work in progress**
>
> This repository is **not maintained** and was **never completed**. The simulation is experimental and currently **broken** in the browser (rendering / GPU pipeline issues, brush painting instability, and incomplete perf refactors).
>
> The initial commit runs a basic WebGPU fire sandbox with oxygen-driven combustion. Later local changes (256×256 grid, CPU brush painting, combined compute passes) were not finished or verified. **Do not expect this to work out of the box.**
>
> Forks and PRs are welcome if you want to pick it up, but there is no active development planned.

---

GPU fire simulation in the browser (WebGPU). Oxygen concentration drives combustion — starve a sealed room and vent it for a backdraft-like flash.

## Requirements

- A browser with **WebGPU** support:
  - **Chrome / Edge** — recent versions (WebGPU enabled by default)
  - **Firefox 141+ on Windows** — WebGPU enabled by default
  - **Firefox on macOS / Linux** — enable in `about:config`: set `dom.webgpu.enabled` to `true` (restart Firefox). If blocked, also set `gfx.webgpu.ignore-blocklist` to `true`.
- Node.js 18+ (for development only)

## Run

```bash
npm install
npm run dev
```

Open the URL shown (usually http://localhost:5173).

## Controls

| Brush | Action |
|-------|--------|
| **Fire** | Paint fuel + heat + smoke (default) |
| **Fuel** | Paint combustible material |
| **Heat** | Ignite / add temperature |
| **Wall** | Draw solid barriers (blocks flow & O₂) |
| **Vent** | Erase walls to open a hole |
| **Erase** | Clear walls and reset cell contents |
| **O₂** | Paint ambient oxygen (debug) |

**Viz modes:** Beauty, Oxygen, Temperature, Fuel

## Backdraft demo (intended — not reliably working)

1. Select **Wall**, draw a closed rectangle (no gaps).
2. Select **Fuel**, fill the floor heavily inside.
3. Select **Heat**, tap center briefly to ignite.
4. Switch viz to **Oxygen** — watch the room turn dark as O₂ burns away; flame dies in Beauty mode.
5. Switch back to **Beauty**. Optionally add a bit more heat so the room stays hot.
6. Select **Vent**, poke a hole on one wall.
7. Observe oxygen-rich air enter and a **flash / jet** out the vent.

## Architecture (intended)

- Eulerian grid fluid sim on WebGPU storage buffers
- Stam-style stable fluids (advect → pressure project)
- Combustion gated by fuel + temperature + **oxygen**
- `divSource` from combustion creates expansion pressure (backdraft punch)

## Known unfinished issues

- Simulation display can go black or only update while interacting
- GPU brush splat was replaced with CPU painting; sync is fragile
- Pressure solve / bind-group ping-pong was refactored but not stabilized
- Grid size and shader constants may be out of sync across passes

## Build

```bash
npm run build
```
