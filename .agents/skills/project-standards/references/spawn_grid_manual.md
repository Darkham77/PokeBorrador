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
