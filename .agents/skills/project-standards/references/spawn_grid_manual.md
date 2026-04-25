# DESIGN: Dynamic Spawn Grid

## 1. Overview

The Spawn Grid is a responsive system designed to display Pokémon on route cards. It prevents layout overflow across different resolutions by dynamically scaling grid density and sprite sizes.

## 2. Technical Specification

### 2.1 Grid Logic (Vue)

The grid dimensions are calculated based on the number of Pokémon ($N$) and a preferred column count (3-5) derived from the container's width (via `ResizeObserver`).

- **Responsive Columns**:
  - Width > 580px: 5 columns
  - Width > 420px: 4 columns
  - Default: 3 columns
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

## 4. Discovery System (Fog of War)

### 4.1 Two Independent Flags

Map spawns use **two independent boolean flags** computed from the player's Pokédex state:

| Flag | Source | Effect |
| :--- | :--- | :--- |
| `isSeen` | `seenPokedex.includes(id)` OR `pokedex.includes(id)` | Reveals name + type info in **tooltips** |
| `isCaught` | `pokedex.includes(id)` | Removes the **silhouette** from the sprite |

These flags are computed in `processedGrid` and `processedGuardian` inside `MapCard.vue`.

### 4.2 Map vs Pokédex Visual Behavior

The Map and Pokédex intentionally use **different visuals** for the "never seen" state:

| Context | Never Seen | Seen (not caught) | Caught |
| :--- | :--- | :--- | :--- |
| **Map** | Silhouette (black sprite) | Silhouette + name in tooltip | Full color |
| **Pokédex** | `???` text, no image | Silhouette + name | Full color |

The Map is the **only** place where never-seen Pokémon show a silhouette. This is an intentional design choice for the exploration feel. Do not add silhouettes to the Pokédex for unknown entries.

### 4.3 Canonical Filter Point

- **Map**: All discovery logic lives in `MapCard.vue` → `processedGrid` and `processedGuardian` computed.
- **Pokédex**: All discovery logic lives in `src/composables/usePokedex.js` → `pokemonList` computed.

When adding a new debug mode or changing visibility rules, **both** files must be updated — they are independent systems.

### 4.4 Debug Mode Override Pattern

Both systems follow the same 4-state if/else pattern:

```js
if (debugMode === 'none') {
  isSeen = false; isCaught = false        // Force unknown
} else if (debugMode === 'seen') {
  isSeen = true; isCaught = false         // Force seen-only
} else if (debugMode === 'caught') {
  isSeen = true; isCaught = true          // Force caught
} else {
  isSeen = seenPokedex.includes(id) || pokedex.includes(id)  // Real
  isCaught = pokedex.includes(id)
}
```

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

