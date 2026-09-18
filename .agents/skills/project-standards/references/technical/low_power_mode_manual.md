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

## 6. Background Tab Lifecycle & GSAP Ticker Sleeping

To eliminate CPU heat and battery drain when Poké Vicio is running in an inactive browser tab or minimized window:

- **Visibility Change Listener**: The application entry point registers a `document.addEventListener('visibilitychange', ...)` handler.
- **Ticker Sleep**: When `document.hidden` becomes `true`, the global GSAP ticker is put to sleep via `gsap.ticker.sleep()`.
- **Ticker Wake**: When the user returns to the tab (`document.hidden` is `false`), the ticker immediately wakes up via `gsap.ticker.wake()`, resuming animations seamlessly without timing drift.

## 7. Distinction: Low Power Mode vs. Fast Mode (Modo Rápido)

It is crucial to distinguish **Low Power Mode** from **Fast Mode**:

1. **Low Power Mode (`isLowPowerActive`)**:
   - **Trigger**: User setting in `SettingsModal.vue` (`'auto'`, `'enabled'`, `'disabled'`) or mobile viewport `< 768px`.
   - **Action**: Scales down texture resolution (loads `_mobile.webp` assets), reduces particle counts by 50%, and disables secondary cosmetic depth layers (`layer-2`).
2. **Fast Mode (`isFastMode` / Modo Rápido)**:
   - **Trigger**: Automatic runtime state whenever a modal obscuring the screen opens in `modalStore.stack`, or when a battle opens over the world map (`battleStore.isBattleActive`).
   - **Action**: Completely unmounts heavy decorative elements on background views (such as 420 leaf nodes in `AtmosphereLeavesOverlay.vue`), suspends background card animations, and shuts down background weather processing.
   - **Foreground Isolation**: Foreground active views (such as the battle arena in `BattleArenaView.vue`) MUST NOT enter fast mode for themselves, preserving full 60 FPS visual rendering of active battle weather and combatants.

