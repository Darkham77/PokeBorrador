# 2D Game Development

> Principles for 2D game systems.

---

## 1. Sprite Systems

### Sprite Organization

| Component | Purpose |
| :--- | :--- |
| **Atlas** | Combine textures, reduce draw calls |
| **Animation** | Frame sequences |
| **Pivot** | Rotation/scale origin |
| **Layering** | Z-order control |

### Animation Principles

- Frame rate: 8-24 FPS typical
- Squash and stretch for impact
- Anticipation before action
- Follow-through after action

---

## 2. Tilemap Design

### Tile Considerations

| Factor | Recommendation |
| :--- | :--- |
| **Size** | 16x16, 32x32, 64x64 |
| **Auto-tiling** | Use for terrain |
| **Collision** | Simplified shapes |

### Layers

| Layer | Content |
| :--- | :--- |
| Background | Non-interactive scenery |
| Terrain | Walkable ground |
| Props | Interactive objects |
| Foreground | Parallax overlay |

---

## 3. 2D Physics

### Collision Shapes

| Shape | Use Case |
| :--- | :--- |
| Box | Rectangular objects |
| Circle | Balls, rounded |
| Capsule | Characters |
| Polygon | Complex shapes |

### Physics Considerations

- Pixel-perfect vs physics-based
- Fixed timestep for consistency
- Layers for filtering

---

## 4. Camera Systems

### Camera Types

| Type | Use |
| :--- | :--- |
| **Follow** | Track player |
| **Look-ahead** | Anticipate movement |
| **Multi-target** | Two-player |
| **Room-based** | Metroidvania |

### Screen Shake

- Short duration (50-200ms)
- Diminishing intensity
- Use sparingly

---

## 5. Genre Patterns

### Platformer

- Coyote time (leniency after edge)
- Jump buffering
- Variable jump height

### Top-down

- 8-directional or free movement
- Aim-based or auto-aim
- Consider rotation or not

---

---

## 7. High-Performance Sprite Filters

### Optimized Outlines
- **GPU-Safe Borders**: In dense grids, avoid 4-way or 8-way `Drop-Shadow` filters. Use a 2-way diagonal cross-shadow (e.g., `1px 1px` and `-1px -1px`) to reduce processing by 50% while maintaining visual clarity.
- **Aliasing**: Use a subtle `0.5px` blur on black outlines to simulate high-quality anti-aliasing without the performance hit of complex filter chains.

### Consistency & Parity
- **Static vs Animation**: Always ensure that static filters and `@keyframes` use the exact same filter functions (SASS helpers) to prevent visual flickering or "jumps" during transitions.

---

> **Remember:** 2D is about clarity. Every pixel should communicate.
