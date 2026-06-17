# DESIGN: Dynamic Spawn Grid

## 1. Overview

The Spawn Grid is a responsive system designed to display Pokémon on route cards. It prevents layout overflow across different resolutions by dynamically scaling grid density and sprite sizes.

## 2. Technical Specification

### 2.1 Grid Logic (Vue)

The grid dimensions are calculated based on the number of Pokémon ($N$) and a preferred column count (3-5) derived from the container's width (via `ResizeObserver`).

- **Responsive Columns**:
  - **Large Viewports**: 5 columns
  - **Medium Viewports**: 4 columns
  - **Mobile/Default**: 3 columns
- **Column Decision**: The number of columns is dynamically calculated via `ResizeObserver` to maintain a consistent cell aspect ratio.
- **Minimum Rows**: Always force at least 2 rows to maintain sprite scale consistency.
- **Filling Order**: Bottom-right to top-left.

```javascript
export function calculateSpawnGrid(spawnsCount, preferredCols = 3) {
  let cols = Math.max(3, preferredCols);
  
  // Expand cols if N is very high
  const idealCols = Math.ceil(Math.sqrt(spawnsCount));
  if (idealCols > cols) cols = idealCols;

  let rows = Math.ceil(spawnsCount / cols);
  if (rows < 2 && spawnsCount > 0) rows = 2; // Forced minimum

  return { rows, cols, totalSlots: rows * cols };
}
```

### 2.2 CSS Grid Architecture

- **Container**: Uses `display: grid` with `grid-template-columns: repeat(var(--grid-size), 1fr)`.
- **Scaling**: Sprites use a `--sprite-scale` variable (default `1.0`).
- **Overflow**: `.spawn-slot` must have `overflow: visible` to allow sprites to bleed into neighboring cells when scale > 1.

### 2.3 Visual Standards

- **Empty Slots**: Transparent by default.
- **Debug Mode**: Shows `Hot Pink (#ff00ff)` outlines around all cells.

## 3. Decision Log

- **Approach**: CSS Grid (Approach 1 from Brainstorming).
- **Rationale**: Highest structural rigidity and ease of debug visualization.
- **Scale Strategy**: `transform: scale()` or `calc()` width to allow organic overlap without breaking the grid flow.

## 🔍 Discovery & Fog of War

Refer to the [game_mechanics_manual.md](../core/game_mechanics_manual.md) for the authoritative definitions of the Discovery System (`isSeen`, `isCaught`) and visual differences between Map and Pokédex.

## 5. Map Card Rendering Layers

To maintain visual clarity while applying atmospheric effects and hover states, MapCards use a strict layering system within an isolated stacking context.

### 5.1 Stacking Context Isolation

The `.map-card` component MUST use `isolation: isolate;`. This ensures that negative `z-index` values on pseudo-elements or overlays stay contained within the card and do not bleed behind the main application background.

### 5.2 Standard Layer Hierarchy

Layers are ordered from back to front using the following `z-index` standard:

| Layer | Selector | Z-Index | Purpose |
| :--- | :--- | :--- | :--- |
| **0: Background** | `&::before` | `-3` | The route image with atmosphere filters. |
| **1: Weather** | `.weather-overlay` | `-2 !important` | Particles/Emojis for rain, snow, etc. |
| **2: Atmosphere** | `&::after` | `-1` | Dark vignette and hover contrast layers. |
| **3: Content** | `& > *` | `var(--z-base)` (0) | Interactive sprites, headers, and pills. |

### 5.3 Atmosphere & Hover Dynamics

- **Default State**: Background (`::before`) uses `Brightness(0.8)` to ensure pills and sprites stand out.
- **Hover State**:
  - Background scales up and brightens (`Brightness(1.0)`).
  - Atmosphere (`::after`) opacity increases with a dark gradient to maintain text legibility against the brighter background.
  - Interactive content MUST NOT have its opacity reduced; it remains at `1.0` to ensure interactivity.

## 6. Tooltip & Discovery Policy

To maintain the "Fog of War" and a clean UI, tooltips on route cards follow these standards:

- **Time Emojis**: Use emojis (🌅, 🌞, 🌇, 🌙) in spawn tooltips to save space and maintain the retro aesthetic.
- **Discovery State**:
  - **Known (Seen/Caught)**: Display exact cycles using emojis: `Usual times: 🌅 🌞`.
  - **Unknown**: Use the generic label `Not common in this route` for any Pokémon with time restrictions to avoid spoilers.
- **24h Consistency**: Pokémon also available via **Fishing** are treated as 24h spawns; they do not display time restrictions.

## 7. Synchronization & Robustness

### 7.1 Grid-to-Card State Sync

The environment state (weather, cycle) must be calculated once at the parent level (`MapGrid`) and propagated to children via the `forced-weather` prop. This prevents visual artifacts where the UI icon (calculated in Card) contradicts the actual spawn pool (calculated in Grid).

### 7.2 Deterministic Weather (Null Handling)

When calculating weather, a `null` or `undefined` global state MUST trigger the deterministic `getRouteWeather` function. Skipping this check (e.g. `if (weather !== 'clear')`) when the value is `null` causes the system to omit climate-injected visitors, breaking the atmospheric experience.

### 7.3 Fallback for Undefined Spawn Lists

When computing the route spawn grid (`spawnGrid` in `MapCard.vue`), if the map configuration does not specify any cycle-based wild spawn lists (`props.map.wild` is undefined), the system must default to active wild status (`isWildActive = true`) for all candidate species. This preserves rendering logic for custom maps or mock test instances where cyclic schedules are omitted.

## 8. Weather & Terrain Resolution Rules

### 8.1 Dual-Type Modifier Evaluation

When evaluating weather spawn modifiers (boosts, debuffs, or blocks in `getWeatherMultiplier`), calculations must evaluate both the primary type (`type`) and the secondary type (`type2`). Dual-type species (such as Pidgey, which is Normal/Flying) must be subject to blocks affecting either of their types (e.g. storm blocking Flying types) to prevent invalid encounters from appearing on the map or report list.

### 8.2 Comprehensive Terrain Tags Display

When presenting map terrain tags (under "Entorno" or similar details panel), avoid nesting ternaries in Vue templates which limit display to the first matching tag. Implement a computed list (e.g. `terrainTags`) to list all active environment flags (such as both Crystal Cave and Cave, or Volcano and Plains) simultaneously.
