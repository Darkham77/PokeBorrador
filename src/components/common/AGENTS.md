# Purpose

Manage the logic and assets of common.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Tooltip Wrapper Alignment in Flex Containers**: When consuming `PVTooltip` inside flex container layouts (e.g., vertical lists with `flex-direction: column`), parent containers MUST explicitly declare cross-axis alignment (`align-items: flex-start;` or similar) if child elements have dynamic intrinsic widths. This prevents the default `stretch` behavior from causing `.pv-tooltip-wrapper`'s internal `justify-content: center !important;` from misaligning shorter sibling elements.
- **Atmosphere Layer OffscreenCanvas & Weather Texture Preload Contract (`AtmosphereLayer.vue`, `AtmosphereLeavesOverlay.vue`)**: Weather noise textures preloaded for `createImageBitmap` transfer to OffscreenCanvas Web Workers MUST set `img.crossOrigin = 'anonymous'` to prevent cross-origin security exceptions across mobile and secure contexts. The dynamic container `useResizeObserver` MUST enforce a minimum resize delta threshold (`ATMOSPHERE_RESIZE_THRESHOLD_PX = 20`) before dispatching `RESIZE` events to the Web Worker, shielding mobile browsers from continuous canvas buffer re-allocations and visual texture flickering during touch scrolling. Decomposes wind/storm leaf elements into `AtmosphereLeavesOverlay.vue` and unifies rain/snow precipitation rendering to eliminate template cognitive complexity.
  - **Modo Rápido & Background Unmounting**: `AtmosphereLeavesOverlay.vue` conditionally unmounts (`v-if="!isFastModeActive"`) to instantly drop all DOM leaf nodes whenever Modo Rápido is active (e.g. modals or combat active).
  - **GPU Performance Constraints**:
    1. Zero `mix-blend-mode`: Precipitation layers use translucent RGBA layers instead of `screen` to avoid Chromium framebuffer readbacks.
    2. Zero heavy filters: Lightning flashes use concentric SVG strokes instead of `filter: drop-shadow()` to eliminate real-time Gaussian convolution.
    3. Clamped insets: Atmospheric container insets are clamped to max `128px` to prevent fragment overdraw.
    4. GPU-native animations: GSAP modifiers (`modifiers: { x/y: ... }`) are banned in favor of GPU-accelerated `fromTo` loops.
  - **Foreground Battle Scoping**: Foreground battle is never in `isFastMode`; `AtmosphereLayer.vue` within combat retains full weather rendering, only suppressing it if an obscuring modal is opened directly on top of the combat arena.
- **Sprite Persistent FX Helpers (`spritePersistentFXHelpers.ts`, `PVSpriteFX.vue`)**: Centralizes and isolates GSAP tweens for persistent status conditions (`brn`, `psn`, `par`, `frz`, `slp`), volatile effects (`isCursed`, `isConfused`, `isTaunted`, etc.), and guardian aura pulse effects.
  - **Decoupled Combat Layering Props (`hideStatusOverlay`, `overlayOnly`)**: `PVSpriteFX.vue` supports `:hide-status-overlay="true"` to render only the physical sprite at Level 2, and `:overlay-only="true"` to render exclusively floating status emojis (`PVStatusFX`) and screen auras (`PVAuraFX`) at Level 4. When `overlayOnly` is active, the physical sprite container (`.pv-fx-sprite-layer`) is unmounted and `refreshPersistentFX` is safely bypassed.
- **Atmosphere Layer Architecture & Seamless Tiling (`AtmosphereLayer.vue`, `useAtmosphereSnowAnim.ts`, `useAtmosphereSandstormAnim.ts`)**:
  - **Modular Layering Mode (`layer`)**: Supports `'ambient'` (sky tint, fog/sand canvas), `'particles'` (precipitation, lightning, leaves with `.is-particles-layer` transparent background), and `'all'` (default backward-compatible combined mode).
  - **Camera-Level Heat Shimmer Canvas Activation (`isHeatWeather`)**: Weather heat distortion and atmospheric mirage noise (`sun`, `intense_sun`, `heatwave`) operate at the camera/viewport level. In combat, the camera overlay is mounted with `layer="particles"`, while overworld map cards use `layer="all"`. Canvas worker activation and rendering for heat weathers MUST activate when `layer !== 'ambient'` (rendering on both `particles` and `all`), ensuring heat shimmer is never suppressed at camera level while keeping background ambient layers clear.
  - **Seamless Modulo Tile Periods**: Continuous texture drifts use mathematical constants (`WEATHER_TILE_SNOW_L1_PX = 256px`, `WEATHER_TILE_SNOW_L2_PX = 128px`, `WEATHER_TILE_HAIL_L1_PX = 128px`, `WEATHER_TILE_SANDSTORM_PX = 512px`) and seed-based initial progress (`.progress(seed % 1)`) to eliminate texture cuts or edge empty space.
- **Base Modal Decomposition (`BaseModal.vue`, `BaseModalHeader.vue`, `BaseModalFooter.vue`, `BaseModalOverlay.vue`)**: Encapsulates the modal title stack, emoji/icon slots, header styles, and close button variants into `BaseModalHeader.vue`, the footer action bar into `BaseModalFooter.vue`, and the GSAP-animated backdrop transition into `BaseModalOverlay.vue`, maintaining clean slot forwarding and zero-complexity render functions.
- **Status Condition Particle System & Overlay Layer (`statusParticleHelpers.ts`, `PVStatusOverlayLayer.vue`, `PVStatusFX.vue`)**: Centralizes GSAP particle timeline building, wobble transitions, and multi-category overlay rendering (primary, secondary, tactical, and field) into modular helpers and dedicated overlay SFCs to eliminate cognitive/cyclomatic complexity.
- **Tooltip Line Decomposition (`PVTooltip.vue`, `PVTooltipDescriptionLine.vue`)**: Encapsulates single-line description formatting, quote styles, emoji bullets, boost/debuff indicators, and divider lines into `PVTooltipDescriptionLine.vue`, reducing parent tooltip template complexity below thresholds.
- **Tooltip Viewport Overflow & Dynamic Ellipsis Truncation (`PVTooltip.vue`)**: Large tooltips rendering extensive lists or descriptions (such as inventory breakdowns, moves, or logs) MUST NEVER exceed the visible viewport bounds or slice text lines in half horizontally. The component dynamically calculates available vertical space based on trigger position, safe padding (`PADDING_PX = 15`), gap (`GAP_PX = 12`), wrapper chrome (`TOOLTIP_CHROME_VERTICAL_PX = 24`), and UI zoom (`--app-zoom`). If content overflows, `PVTooltip` measures line heights in the DOM, renders exclusively the complete lines that fit (`displayedLines`), and appends a `.pv-tooltip-ellipsis` indicator (`...`) at the bottom. Measurement and line reduction occur during the initial transition frame before GSAP opacity fade-in to prevent visual flicker. Window resize events automatically dismiss open tooltips to prevent orphaned overlays.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
