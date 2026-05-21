# Low Power Mode & Mobile Performance Manual

This manual defines the implementation standards for the game's Low Power Mode (LOD & GPU optimization) to ensure consistent 60 FPS performance on mobile devices and low-spec machines.

## 1. Overview & Architecture

The Low Power Mode mitigates GPU, CPU, and VRAM memory pressure by:

1. **Dynamic Resolution Scaling**: Serving low-resolution, high-fidelity nearest-neighbor scaled assets on smaller viewports or when manually enabled.
2. **Atmospheric Effect Simplification**: Disabling secondary cosmetic particle layers (e.g., secondary weather parallax loops) and reducing overall particle density.
3. **Persisted State Integration**: Synchronizing user preferences via `LocalStorage` under the `'low-power-mode'` key.

## 2. Triggering and Activation Logic

The system operates under three modes:

- `'auto'` (Default): Optimizations are active if the viewport width (`window.innerWidth`) is below the **768px** mobile breakpoint.
- `'enabled'`: Optimizations are strictly forced on all viewports.
- `'disabled'`: Optimizations are strictly disabled (forcing high-resolution assets and full atmospheric overlays on all viewports).

The global Pinia UI store (`src/stores/ui.ts`) manages this state reactively via `isLowPowerActive`. Components must bind to this computed property.

## 3. Asset Pipeline Standards for Route Maps

When adding new route maps or background images, a mobile-optimized version must be generated:

- **Maximum Resolution**: 400px maximum width, preserving the aspect ratio.
- **Scaling Algorithm**: Nearest Neighbor (`kernel: 'nearest'`) to ensure that pixel art remains sharp and crisp without introducing blur or interpolation artifacts.
- **Naming Convention**: A `_mobile.webp` suffix must be appended to the base filename (e.g., `ruta1_dia_mobile.webp`).
- **Asset Service Routing**: The global `assetService` (`getAssetUrl`) must append the suffix automatically when the `isLowPower` option is requested.

## 4. Atmospheric Layer Optimizations (AtmosphereLayer.vue)

When implementing weather, time, or environmental effects:

- **Multi-layer Parallax Limitation**: High-cost cosmetic effects must be separated into at least two layers (e.g., `layer-1` and `layer-2`). In low power mode, `layer-2` (secondary depth, purely cosmetic accents) **MUST NOT** be rendered or animated.
- **GSAP Tweens Cleanup**: Avoid registering or initializing GSAP animations for disabled layers to save CPU cycles and prevent memory leaks.
- **Particle Count Reduction**: Particle-based animations (e.g., falling leaves, snow, dust) **MUST** scale down their count (typically by 50%) when `isLowPowerActive` is true.

## 5. Settings Integration

The `SettingsModal.vue` must expose control buttons for "BAJO CONSUMO" (Low Power Mode) allowing users to switch between `'auto'`, `'enabled'`, and `'disabled'` values. All options must styled using the unified retro-modern UI system.
