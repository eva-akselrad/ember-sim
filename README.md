# ember-sim

GPU fire simulation in the browser (WebGPU). Oxygen concentration drives combustion — starve a sealed room and vent it for a backdraft-like flash.

## Requirements

- Chrome or Edge with WebGPU enabled
- Node.js 18+

## Run

```bash
npm install
npm run dev
```

Open the URL shown (usually http://localhost:5173).

## Controls

| Brush | Action |
|-------|--------|
| **Fuel** | Paint combustible material |
| **Heat** | Ignite / add temperature |
| **Wall** | Draw solid barriers (blocks flow & O₂) |
| **Vent** | Erase walls to open a hole |
| **Erase** | Clear walls and reset cell contents |
| **O₂** | Paint ambient oxygen (debug) |

**Viz modes:** Beauty, Oxygen, Temperature, Fuel

## Backdraft demo

1. Select **Wall**, draw a closed rectangle (no gaps).
2. Select **Fuel**, fill the floor heavily inside.
3. Select **Heat**, tap center briefly to ignite.
4. Switch viz to **Oxygen** — watch the room turn dark as O₂ burns away; flame dies in Beauty mode.
5. Switch back to **Beauty**. Optionally add a bit more heat so the room stays hot.
6. Select **Vent**, poke a hole on one wall.
7. Observe oxygen-rich air enter and a **flash / jet** out the vent.
8. If weak: increase brush fuel, raise `EXPANSION` / `HEAT_RELEASE` in `src/sim/constants.ts`.

## Architecture

- 512×512 Eulerian grid on WebGPU storage buffers
- Stam-style stable fluids (advect → pressure project)
- Combustion gated by fuel + temperature + **oxygen**
- `divSource` from combustion creates expansion pressure (backdraft punch)

## Build

```bash
npm run build
```
