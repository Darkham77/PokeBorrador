# Combat Camera Standard (v2 - Symbolic Coordination)

This manual defines the technical and mathematical standards for the combat camera system. To maintain flexibility, **DO NOT hardcode virtual dimensions** in documentation; refer to symbolic constants from the centralized coordinator.

## 🏛️ Spatial Architecture

The system uses a nested coordinate system:
**Viewport** (Browser) -> **Camera** (Letterboxed Frame) -> **Virtual World** (Canvas).

### 1. Spatial Coordinator (The Source of Truth)

All spatial logic is centralized in `@/logic/combat/spatialCoordinator.ts`. Components and manuals must use these symbolic references to ensure integrity when constants change.

| Constant | Symbolic Role | Description |
| :--- | :--- | :--- |
| `MAP_WIDTH / HEIGHT` | **World Bounds** | The total canvas size for background and object placement. |
| `SAFE_ZONE_WIDTH/HEIGHT` | **Action Area** | The 3:2 rectangular zone where critical combat action occurs. |
| `VISIBLE_UNITS_X/Y` | **Camera Target** | The target unit density for visibility. Usually `HEIGHT + Padding`. |
| `TARGET_X / Y` | **Focal Point** | The camera center. `TARGET_Y` is offset to ensure bottom-alignment. |
| `OBJECT_SCALE` | **Pixel Density** | Multiplier to maintain pixel-art crispness at various sizes. |
| `ENTITY_SIZE_P1/P2` | **Occupancy** | Side-specific bounding boxes for combatants. |
| `POKEBALL_SIZE_P1/P2` | **Item Scale** | Side-specific perspective size for Poké Balls (1:5 ratio to 0.3m Pokémon). |

### 2. Entity Positioning

Entities are positioned relative to the `SAFE_ZONE` boundaries.

- **Anchor P1 (Player)**: Aligned to `SAFE_ZONE_X` and `(SAFE_ZONE_Y + SAFE_ZONE_HEIGHT) - ENTITY_SIZE_P1`.
- **Anchor P2 (Enemy)**: Aligned to `(SAFE_ZONE_X + SAFE_ZONE_WIDTH) - ENTITY_SIZE_P2` and `SAFE_ZONE_Y`.
- **Relativity**: All environment objects (bushes, shadows) must calculate their offsets relative to these side-specific anchors.

## 📏 Mathematical Logic

### Camera Scaling & Letterboxing

The camera frame applies dynamic letterboxing/pillarboxing to protect the safe zone's aspect ratio:

1. **Aspect Ratio Constraints**:
   - Max/Min ratios are defined to prevent extreme distortion on ultra-wide or ultra-tall screens.
   - Values outside these bounds trigger black bars (Pillarbox/Letterbox).

2. **Global Scale Calculation**:
   - The scale is determined by the minimum ratio between the available frame and the `VISIBLE_UNITS` constants.
   - `Scale = Math.min(FrameW / VisibleX, FrameH / VisibleY)`.

3. **Bottom-Alignment Centering**:
   - The `TARGET_Y` focal point is calculated to align the **bottom** of the Safe Zone with the **bottom** of the Viewport.
   - `TARGET_Y = (SAFE_ZONE_Y + SAFE_ZONE_HEIGHT) - (VISIBLE_UNITS_Y / 2)`.
   - This ensures a cinematic "grounded" look with all safety padding concentrated at the top.

### Dynamic Zoom Clamping & Zero Black Bars Protection

To guarantee resolution independence across arbitrary aspect ratios (including ultrawide 21:9 and vertical mobile 9:16) without exposing unrendered backdrop black bars, the camera enforces dynamic zoom clamping:

1. **Cover Scale Calculation**:
   $$\text{coverScale} = \max\left(\frac{W_{\text{cam}}}{W_{\text{map}}}, \frac{H_{\text{cam}}}{H_{\text{map}}}\right) \times 1.02$$

2. **Dynamic Minimum Zoom**:
   $$\text{minZoom} = \operatorname{clamp}\left(\frac{\text{coverScale}}{\text{baseScale}}, 0.4, 1.0\right)$$
   Rounded up to 1 decimal place to guarantee seamless button stepping in UI controls (`CameraZoomControls.vue`).

3. **Scale & Pan Boundary Clamping**:
   $$\text{effectiveScale} = \max(\text{coverScale}, \text{baseScale} \times \text{effectiveZoom})$$
   $$\text{minTx} = W_{\text{cam}} - W_{\text{map}} \times \text{effectiveScale}$$
   $$tx = \min(0, \max(\text{minTx}, \text{desiredTx}))$$
   This ensures that even when panning or zooming out to the maximum allowed limit, the arena canvas always fills 100% of the visible frame.

## 🛠️ Debugging Standards

When `showGuides` is enabled, the system MUST display:

1. **Virtual World Boundary**: Represents the total `MAP` limits.
2. **Safe Zone**: Rectangular box representing the `3:2` action area.
3. **Entity Anchors**: Side-specific boxes representing the `ENTITY_SIZE_P1/P2` footprint.

> [!IMPORTANT]
> **Zero-Hardcoding Policy**: Documentation must explain the **Logic and Ratios**. The **Numbers** live exclusively in `spatialCoordinator.ts`. If a value needs to be cited for clarity, it must be marked as "Current Example" or "Variable".

## 📐 Resolution Independence

- **Virtual Units vs Scale**: Always separate the logical size (e.g., 300 units) from the physical pixel scale (e.g., x2). This allows for density adjustments without re-calculating the entire world's geometry.
- **Pixel-Perfect Integrity**: When using an `OBJECT_SCALE`, ensure that all related assets (shadows, outlines) use integer multiples of the base size to avoid sub-pixel blurring.
