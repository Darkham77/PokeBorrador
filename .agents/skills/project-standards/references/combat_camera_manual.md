# Combat Camera Standard (Poké Vicio)

This manual defines the technical and mathematical standards for the combat camera system, ensuring a consistent and responsive experience across all devices.

## 🏛️ Spatial Architecture

The system uses a nested coordinate system:
**Viewport** (Browser) -> **Camera** (Letterboxed Frame) -> **Virtual World** (Canvas).

### 1. Global Constants

| Constant | Value | Description |
| :--- | :--- | :--- |
| `MAP_WIDTH` | `3000` | Total virtual width of the battle arena. |
| `MAP_HEIGHT` | `3000` | Total virtual height of the battle arena. |
| `VISIBLE_UNITS` | `1000` | Size of the central action zone that MUST always be visible. |
| `TARGET_X` | `1500` | Horizontal focal point (Center of the world). |
| `TARGET_Y` | `1500` | Vertical focal point (Center of the world). |
| `RATIO_MAX` | `3.0` | Maximum aspect ratio before letterboxing (3:1). |
| `RATIO_MIN` | `0.33` | Minimum aspect ratio before letterboxing (1:3). |

### 2. Entity Positioning

Entities (Pokémon) are positioned relative to the `1000x1000` Safe Zone located at the center of the world (`[1000, 1000]` to `[2000, 2000]`).

- **Player 1 (Bottom-Left)**: Centered in the bottom-left quadrant of the safe zone.
- **Player 2 (Top-Right)**: Centered in the top-right quadrant of the safe zone.

## 📏 Mathematical Logic

### Camera Scaling
The camera scale is calculated to ensure the `VISIBLE_UNITS` (1000px) action zone fits perfectly within the viewport, regardless of orientation.

```javascript
const scaleX = camWidth / 1000;
const scaleY = camHeight / 1100; // Includes extra vertical padding
const scale = Math.min(scaleX, scaleY);
```

### Centering Formula
The world is translated so that the `TARGET` coordinates are centered in the camera frame.

```javascript
tx = (camWidth / 2) - (TARGET_X * scale);
ty = (camHeight / 2) - (TARGET_Y * scale);
```

## 🛠️ Debugging Standards

When `showGuides` is enabled, the system MUST display:
1. **Virtual World Boundary**: A red border representing the `3000x3000px` limits.
2. **Safe Zone**: A dashed white box representing the `1000x1000px` action area.
3. **Entity Anchors**: Red boxes representing the fixed 400x400 slots for combatants.

> [!IMPORTANT]
> Any changes to the virtual world dimensions MUST be reflected in `useCombatCamera.js`, `_battle.scss`, and this documentation simultaneously to maintain system integrity.
