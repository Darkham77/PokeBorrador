# Atmospheric & Weather Effects

This manual details the technical implementation and mathematical requirements for atmospheric systems in the Poké Vicio project.

---

## 🌪️ Weather Modularity

To prevent style regressions and maintain codebase health:

- **MANDATORY**: Each weather type (rain, sandstorm, snow) MUST be encapsulated in its own dedicated CSS block or SCSS mixin.
- **FORBIDDEN**: Sharing generic layer classes (e.g., `.layer-1`, `.parallax-bg`) across different weather types without strict isolation. Changes to one weather effect (e.g., sandstorm contrast) should never impact another (e.g., rain speed).

---

## 🔄 Seamless Infinite Looping

Background animations for weather effects (falling snow, moving sand) MUST be mathematically precise to avoid visible "jumps" or "snaps" when the animation restarts.

### The Loop Formula

For an animation to be perfectly seamless:
> **Animation Translation Distance** = **Background Size** (or an exact multiple)

**Example (Snow):**

- `background-size: 256px 256px;`
- `transform: Translate(-256px, 256px);` → **SEAMLESS ✅**
- `transform: Translate(-128px, 128px);` → **VISIBLE JUMP ❌**

**Optimization Tip**: Use `linear` timing functions for environmental loops to ensure a constant velocity that matches the physical nature of wind or precipitation.

---

## 🎭 Depth & Parallax

- **Multiple Layers**: Always use at least 2 layers of particles to create a sense of 3D depth.
- **Velocity Offsets**: Foreground layers should move faster and have larger particles; background layers should be slower, smaller, and slightly blurred.
- **Angle Consistency**: Ensure that rain or snow falls at consistent angles across all layers unless a "turbulence" effect is specifically requested.
