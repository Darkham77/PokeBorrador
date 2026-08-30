# Map Card & Spawn Grid UI Standards

> **Scope & Authority**: This manual defines the CSS Grid architecture, `ResizeObserver` responsive columns, visual layering, and Fog of War UI rendering for `MapCard.vue` and route spawn grids.
> **Sources of Truth**:
> - Spawn Math & Encounter Rates: [`encounter_manual.md`](./encounter_manual.md)
> - UI/UX Architecture: [`../core/ui_ux_standards.md`](../core/ui_ux_standards.md)
> - Time Cycles & Weather: [`../core/time_system_manual.md`](../core/time_system_manual.md)

---

## 1. 📐 Responsive Grid Architecture (Vue)

The spawn grid dynamically computes column count and cell dimensions to prevent layout overflow across viewports:

- **Column Thresholds**:
  - **Large Viewports**: 5 columns
  - **Medium Viewports**: 4 columns
  - **Mobile / Compact**: 3 columns
- **ResizeObserver**: Grid dimensions are recalculated via `ResizeObserver` to maintain a consistent cell aspect ratio.
- **Minimum Rows**: Forces at least 2 rows when spawns exist to maintain visual density.
- **Filling Order**: Fills from bottom-right to top-left.

```javascript
export function calculateSpawnGrid(spawnsCount, preferredCols = 3) {
  let cols = Math.max(3, preferredCols);
  
  // Expand cols if N is high
  const idealCols = Math.ceil(Math.sqrt(spawnsCount));
  if (idealCols > cols) cols = idealCols;

  let rows = Math.ceil(spawnsCount / cols);
  if (rows < 2 && spawnsCount > 0) rows = 2;

  return { rows, cols, totalSlots: rows * cols };
}
```

### 1.2 CSS Grid Architecture & Visual Standards
- **Container**: Uses `display: grid` with `grid-template-columns: repeat(var(--grid-size), 1fr)`.
- **Scaling**: Sprites use a `--sprite-scale` variable (default `1.0`).
- **Overflow**: `.spawn-slot` must have `overflow: visible` to allow sprites to bleed into neighboring cells when scale > 1.
- **Empty Slots**: Transparent by default.
- **Debug Mode**: Shows `Hot Pink (#ff00ff)` outlines around all cells.

---

## 2. 🎨 CSS Grid & Layering Hierarchy

### 2.1 Stacking Context Isolation
The `.map-card` component **MUST** use `isolation: isolate;`. This ensures negative `z-index` layers (such as weather overlays and background filters) stay strictly contained inside the card.

### 2.2 Standard Layer Hierarchy

| Layer | Selector | Z-Index | Purpose |
| :--- | :--- | :--- | :--- |
| **0: Background** | `&::before` | `-3` | Route background image with atmospheric filters. |
| **1: Weather Overlay** | `.weather-overlay` | `-2 !important` | Weather particles / ambient overlay. |
| **2: Atmosphere** | `&::after` | `-1` | Dark vignette and hover contrast layers. |
| **3: Content** | `& > *` | `var(--z-base)` (0) | Interactive Pokémon sprites, headers, and pills. |

### 2.3 Atmosphere & Hover Dynamics
- **Default State**: Background (`::before`) uses `brightness(0.8)` so foreground sprites and pills stand out.
- **Hover State**:
  - Background scales up slightly and brightens (`brightness(1.0)`).
  - Atmosphere (`::after`) dark gradient opacity increases to maintain text contrast.
  - Interactive content opacity remains at `1.0` (never dimmed).

---

## 3. 🔍 Discovery & Fog of War Policy

- **Time Emojis**: Use standardized emojis (🌅, 🌞, 🌇, 🌙) in spawn tooltips to save horizontal space while preserving retro aesthetics.
- **Discovery State**:
  - **Known (`isSeen` or `isCaught`)**: Display exact active schedules using emojis: `Usual times: 🌅 🌞`.
  - **Unknown (`!isSeen && !isCaught`)**: Display generic label `Not common in this route` to prevent spoilers.
- **Fishing Species**: Pokémon available via fishing are treated as 24h spawns and do not display time restrictions.

---

## 4. 🔄 Synchronization & Robustness

### 4.1 Grid-to-Card State Sync
The route environment state (weather, time cycle) must be evaluated at the parent grid level (`MapGrid`) and passed down to children via props (`forced-weather`). This prevents UI badge mismatches with the active encounter pool.

### 4.2 Fallback for Custom/Mock Maps
If a map definition does not specify cycle-based wild spawn lists (`props.map.wild` is undefined), default to active wild status (`isWildActive = true`) for all candidate species to prevent empty rendering in test or debug environments.
