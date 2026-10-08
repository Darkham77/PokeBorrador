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
- **Atmospheric Leaf Particle Geometry & Dual Trajectory Mandate (`useAtmosphereLeafAnim.ts`)**:
  - **Dedicated Entry Geometries**: Leaf particle animations in wind, strong winds, and storm weathers MUST differentiate between top-edge entry and side-edge entry to guarantee visually balanced atmosphere:
    1. *Top Entry*: Spawns at `top: -5%..-9%` (just above the viewport to enter immediately within 0.1s) and `left: 20%..110%` across the ceiling. Travels with deep downward trajectory `y: 135cqh` and horizontal wind drift `x: -120cqw`.
    2. *Side Entry*: Spawns at `left: 102%..107%` (just off the right border) and `top: 2%..67%` down the right flank. Travels with sweeping cross-wind trajectory `x: -140cqw` and downward descent `y: 100cqh`.
  - **Zero Flat Vector Trap**: It is strictly forbidden to apply a flat horizontal travel vector (e.g. `x: -280cqw, y: 90cqh`) to top-spawning particles within `overflow: hidden` containers. When horizontal velocity exceeds vertical velocity by >3x, particles starting at $Y \le -25\%$ cross the left edge ($X < 0$) while still in negative Y space, remaining 100% invisible.
  - **Deterministic Parity Alternation**: Leaf particle instances MUST alternate deterministically between top and side spawns via cycle modulo (`cycleIndex % LEAF_SPAWN_CYCLE_MODULO`) so that exactly 50% of active particles descend from above and 50% blow in from the side across all repeated animation cycles.
  - **Responsive Container-Query Sizing & Calibrated Scale**: Leaf particle dimensions MUST NOT use rigid virtual scale overrides (`calc(8px * var(--obj-scale, 2) * 1.5)`) or static pixel values. In `AtmosphereLayer.styles.scss`, base leaf dimensions MUST use container queries (`width: clamp(6px, 2.5cqmin, 14px); height: clamp(5px, 1.9cqmin, 11px);`) so they scale fluidly with container resize without dominating compact encounters. GSAP scale variations in `useAtmosphereLeafAnim.ts` MUST be strictly bounded (`LEAF_MIN_SCALE = 0.85`, `LEAF_SCALE_VARIATION = 0.35`) to keep particles between 0.85x and 1.20x without visual distortion.
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

## Key Files

- `BaseRefreshButton.vue`: Module implementation.
- `baseRefreshButtonTypes.ts`: Type definitions and interfaces for BaseRefreshButton and related components.
- `EggSprite.vue`: Module implementation.
- `ErrorOverlay.vue`: Module implementation.
- `ModalHierarchyProvider.vue`: Module implementation.
- `ModalHost.vue`: Module implementation.
- `PVAuraFX.vue`: Module implementation.
- `PVGenderBadge.vue`: Module implementation.
- `PVHUDButton.vue`: Module implementation.
- `PVLoadingOverlay.vue`: Module implementation.
- `PWAManager.vue`: Module implementation.
- `SVGFilters.vue`: Module implementation.
- `ShopSearchControls.vue`: Module implementation.
- `SortControls.vue`: Module implementation.
- `UnifiedSidebar.vue`: Module implementation.
- `atmosphereParticleHelper.ts`: Module implementation.
- `atmosphereSandstormHelper.ts`: Module implementation.
- `atmosphereSnowHelper.ts`: Module implementation.
- `baseModalHelper.ts`: Module implementation.
- `useAtmosphereRainAnim.ts`: Module implementation.
- [`AtmosphereLayer.styles.scss`](./AtmosphereLayer.styles.scss): Module implementation.
- [`AtmosphereLayer.vue`](./AtmosphereLayer.vue): Module implementation.
- [`AtmosphereLeavesOverlay.vue`](./AtmosphereLeavesOverlay.vue): Module implementation.
- [`BaseModal.vue`](./BaseModal.vue): Module implementation.
- [`BaseModalFooter.vue`](./BaseModalFooter.vue): Module implementation.
- [`BaseModalHeader.vue`](./BaseModalHeader.vue): Module implementation.
- [`BaseModalOverlay.vue`](./BaseModalOverlay.vue): Module implementation.
- [`PVSpriteFX.vue`](./PVSpriteFX.vue): Module implementation.
- [`PVStatusFX.vue`](./PVStatusFX.vue): Module implementation.
- [`PVStatusOverlayLayer.vue`](./PVStatusOverlayLayer.vue): Module implementation.
- [`PVTooltip.vue`](./PVTooltip.vue): Module implementation.
- [`PVTooltipDescriptionLine.vue`](./PVTooltipDescriptionLine.vue): Module implementation.
- [`spritePersistentFXHelpers.ts`](./spritePersistentFXHelpers.ts): Module implementation.
- [`statusParticleHelpers.ts`](./statusParticleHelpers.ts): Module implementation.
- [`useAtmosphereLeafAnim.ts`](./useAtmosphereLeafAnim.ts): Module implementation.
- [`useAtmosphereSandstormAnim.ts`](./useAtmosphereSandstormAnim.ts): Module implementation.
- [`useAtmosphereSnowAnim.ts`](./useAtmosphereSnowAnim.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
