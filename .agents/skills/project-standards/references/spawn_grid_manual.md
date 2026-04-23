# DESIGN: Dynamic Spawn Grid

## 1. Overview
The Spawn Grid is a responsive system designed to display Pokémon on route cards. It prevents layout overflow across different resolutions by dynamically scaling grid density and sprite sizes.

## 2. Technical Specification

### 2.1 Grid Logic (Vue)
The grid dimensions are calculated based on the number of Pokémon ($N$).
- **Minimum Grid**: 3x3 ($N \le 9$)
- **Scaling**: If $N > 9$, the grid dimension ($S$) is calculated as $S = \lceil\sqrt{N}\rceil$.
- **Filling Order**: Bottom-right to top-left.

```javascript
const size = Math.max(3, Math.ceil(Math.sqrt(allSpawns.length)));
const totalSlots = size * size;
const slots = new Array(totalSlots).fill(null);
allSpawns.forEach((id, index) => {
  slots[totalSlots - 1 - index] = id;
});
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
