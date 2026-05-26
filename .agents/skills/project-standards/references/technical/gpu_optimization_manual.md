# GPU Optimization & Performance Manual

This manual details the mandatory techniques for maintaining stable 60 FPS in a high-fidelity visual environment.

## 1. GPU Layer Promotion

All heavy components or those that animate frequently must be promoted to a GPU compositor layer.

- **Mandatory**: Use `@include gpu-layer` on Modals, Overlays, MapCards, PC Box, and HUD.
- **Technique**: This injects `transform: translate3d(0,0,0)` and `backface-visibility: hidden`.
- **Golden Rule**: Elements that animate frequently **MUST** have layer promotion to avoid stuttering.
- **Visibility Trap**: NEVER use `visibility: hidden` to hide an element that has heavy visual filters. This causes the browser to discard the GPU layer; when it becomes `visible` again, the re-paint happens sequentially across frames (glitch). Use `opacity: 0` and `pointer-events: none` instead to keep the layer "warm" in the compositor.
- **Layer Consolidation**: Avoid redundant layer promotion. If a parent (e.g., `BoxPokemonCard`) is already accelerated, do NOT apply `@include gpu-layer` or `will-change` to its children (e.g., Auras). Managing 100+ overlapping layers causes "Scroll-Stop Freezes" during compositor cleanup.
- **Solid Depth Pattern**: Avoid heavy filter chains for large atmospheric effects or auras. They cause massive GPU pressure on multi-layered UIs. Use `box-shadow` with high spread and solid backgrounds with high opacity instead.
- **Context-Aware will-change**: Automated tools and manual implementations MUST check the surrounding block (approx. 500 characters). Only add `will-change` if a `filter` or `transform` exists and NO other `will-change` is present in that context. Duplicate declarations lead to bloated CSS and memory waste.
- **Filter Promotion**: Elements utilizing `filter` (especially in Premium Shell effects or conditional states) **MUST** include `will-change: filter`.
- **Audit Safeguard**: This promotion is required even if the current state is `filter: none !important`, ensuring the compositor layer is pre-allocated and ready for dynamic transitions without triggering "GPU Gap" warnings.
- **Keyframes will-change Collision**: NEVER declare `will-change` inside an active `@keyframes` block, especially for infinite animations. This forces the browser to dynamically allocate and destroy compositor layers on every single animation loop, producing flickering textures and severe rendering jank. Always declare `will-change` statically on the element's base CSS class instead.
- **Z-Index Single Source of Truth**: Never use hardcoded integers for `z-index` (e.g., `10`, `-1`). All layering MUST be relative to centralized variables using `calc(var(--z-base) +/- X)` or named constants (e.g., `var(--z-map-spawns)`). Refer to `src/logic/constants/visuals.ts` for the authoritative values.
- **Pixel Sharpening Layer**: Apply `transform: translateZ(0)` (or its sibling `translate3d(0,0,0)`) to elements with pixel fonts or small pixel-art sprites. This forces the browser to align the element to the physical pixel grid of the compositor layer, eliminating sub-pixel blurring artifacts during scaling or fractional positioning.
- **GSAP Transform Collision**: Animated branding elements (e.g., floating logos) can experience sub-pixel shifting or "jumps" on completion of GSAP transitions. To prevent this, promote the elements to a GPU layer via `will-change: transform, opacity;` and `@include gpu-layer;` in SASS, and apply `clearProps: 'transform'` (or similar) on GSAP animation complete. This ensures the browser's default CSS layout takes over cleanly on the pixel grid.
- **Atmospheric Insets**: For large atmospheric overlays (Fog, Sandstorm), avoid excessive `inset` values (e.g., `-512px`). Use the minimum required to cover movement/parallax (e.g., `-128px`) to significantly reduce GPU memory overhead and avoid flickering in multi-column layouts.

## 2. Low-Cost Animations

- **Allowed Properties**: `transform` (scale, translate, rotate) and `opacity`.
- **Transition Hygiene**: NEVER use `transition: all`. Tracking all properties triggers massive re-layout calculations. Always specify the properties to animate (e.g., `transition: transform 0.2s, opacity 0.2s`).
- **Native Opacity**: NEVER use `filter: Opacity()` for static transparency; use the native `opacity` property to avoid redundant GPU layer creation.
- **Shadow Performance**: `box-shadow` is processed by the GPU's fixed-function hardware (fast). `filter: Drop-Shadow()` requires per-pixel alpha analysis (expensive). Use `box-shadow` for regular glows and card effects. Reserve `Drop-Shadow` ONLY for complex silhouettes (like Pokémon sprites).
  - **DENSITY RULE**: In grids with 50+ items (Box, Bag), NEVER apply more than one `Drop-Shadow()` per item to avoid "GPU Fill-Rate Starvation".
- **Scale Animations**: Avoid non-integer `Scale()` transformations on pixel art. Use **1.03** for subtle hover feedback on mobile.
- **Forbidden Properties**: `margin`, `padding`, `width`, `height`, `top`, `left`, `right`, `bottom` (in animations).
- **Pixel Outlines**: NEVER use "Quad Drop-Shadow" (4 offsets) for sprite outlines in high-density views (Map, Pokedex, PC Box).
  - **MANDATORY**: Use the high-performance SVG Filter `filter: pokemon-outline-optimized()`.
  - **Reasoning**: `feMorphology` dilation is a single-pass operation, reducing GPU fill-rate requirements by 75% compared to 4 Drop-Shadow calls.
  - **Premium Glow**: For soft outlines (glows/auras), include `feGaussianBlur` (stdDeviation 0.5 - 1.0) **inside** the SVG filter. This is more efficient than combining an SVG outline with a CSS `drop-shadow`.
  - **High-Density Sprite Outlining (Grid Optimization)**: In high-density views rendering multiple routes or grids concurrently (e.g., the Map Grid), even SVG filters (`filter: pokemon-outline-optimized()`) can cause heavy GPU layer recomposition and drop FPS. In these scenarios, use **Client-Side Canvas Pre-rendering** (see `spriteOutliner.ts`). Draw the outlined/silhouette texture once on an offscreen canvas, cache the base64 PNG URL, and bind it to the `<img>` `src` with a `.is-pre-rendered` class to bypass all active CSS filters. This reduces repaint overhead to zero.
  - **Aura Pre-rendering (Canvas Caching)**: When using atmospheric or rarity auras (e.g., weather glowing rings, legendary glows) that traditionally rely on complex CSS filter chains like `-webkit-mask-image`, `background-color`, and `filter: blur()`, the repaint cost during animation is high. Instead of calculating these overlays on every frame, use `getProcessedAura` in `spriteOutliner.ts` to pre-render the colored and blurred aura mask on an offscreen Canvas. Cache the resulting base64 PNG data URL, assign it as a CSS variable (e.g. `--pre-rendered-atmos-aura`), and add the `.is-pre-rendered` class to the aura container. The container should then apply it as a static `background-image` with `filter: none !important`, moving the processing cost from a recurring O(N) CPU/GPU rendering overhead to a single O(1) load step while preserving GSAP scale/rotation animations.
  - **Detection**: Run `.agents/skills/project-standards/scripts/audit/detect_outline_traps.py` to identify legacy outlines that require migration to SVG.
- **Will-Change**: Use `@include will-animate(transform, opacity)` only on elements with constant animations (e.g., auras, Shiny pulses). Do not abuse, as it consumes video memory.
- **GSAP Movement vs Opacity**: For high-density particle weather (e.g., Dust Storm), prioritize constant opacity combined with movement over pulsing opacity to minimize GPU recomposition cycles and maintain stability.

## 3. Smooth Scroll & Gutter

- **Standard**: Use `@include smooth-scroll`.
- **Zero Scrollbar Gutter**: `scrollbar-gutter: stable` is forbidden for standard edge-to-edge fluid gaming layouts. However, as an exception, it is **required** for fixed-size central authentication/login screens and standalone dialog panels to prevent card layout jittering when toggling tabs of varying heights (e.g., Local vs Online login).
- **Padding**: Delegate padding to the innermost scrollable component to prevent glow effects from being clipped by the parent container.

## 4. Complexity Management (LOD)

- **LOD (Level of Detail)**: For very long lists (Pokedex, PC Box with 500+ Pokemon), implement virtualization or lazy loading.
- **Memoization**: Use `computed` in Vue to avoid O(N) calculations in every template rendering cycle.
- **Layout Thrashing Prevention**: Do NOT update dimensions or read `offsetHeight` during an active transition or high-frequency scroll.
- **Atomic State Updates**: Ensure that visibility changes (e.g., `isHudHidden`) are atomic and don't trigger simultaneous layout calculations from other reactive dependencies.
- **Zero-Reactivity Scroll**: For scroll-time optimizations (like hiding FX), avoid Vue reactivity (e.g., `isScrolling` ref). Use a direct DOM class (`classList.add('is-scrolling')`) on the container. This prevents a "Reactivity Wave" that re-renders all list items simultaneously, causing frame drops.
- **Reactive VRAM Release**: For components displaying large background images or textures (like `MapCard`), dynamically bind the background-image URL based on visibility (e.g., checking if the component `isVisible` in viewport). When off-screen, set the CSS style property to `'none'` (e.g., `:style="{ '--bg-image': isVisible ? 'url(...)' : 'none' }"`). This forces the browser to immediately release the graphics memory (VRAM) occupied by the texture, preventing texture crashes or out-of-memory errors on mid-to-low-end mobile devices.
- **Zero Heavy Logic in Vue Templates**: It is strictly FORBIDDEN to access database modules (e.g., `DBRouter`, `pokemonDataProvider`, `sqlite`, `supabase`) or perform heavy computations (such as `.map`, `.filter`, `.reduce`, or helper calls retrieving DB rows) directly inside `<template>` expressions or bindings. All templates must render pre-calculated, reactive data structures cached via `computed` properties.
- **Statically Precompute Dense Matrix Data**: For dense, repetitive structures (like large tables of weather patterns across multiple maps with lists of sprites), do not rely on dynamic computed getters that loop over maps and resolve asset URLs repeatedly. Pre-compute the data array statically at the module/script level exactly once on load. Combine this with lazy rendering/accordion structures to only mount visible DOM nodes, reducing compositor pressure and preserving 60 FPS.
- **Zero Serialization in Watchers**: Never run `JSON.stringify` inside reactive watchers. Deep watchers (`{ deep: true }`) must be used with caution, and heavy serializations inside watcher cycles must be completely avoided as they saturate the CPU and cause heavy frame drops.
- **IntersectionObserver Viewport Root**: When registering an `IntersectionObserver` for visibility or zoom tracking (especially in dynamically scaled components like `#zoomable-content`), you must set `root: null` or completely omit the root property. Specifying a custom DOM element as root breaks visibility calculations under browser CSS transforms (scale/zoom), causing items to be falsely flagged as hidden and freezing visual effects.

---

## 5. Modal Synchronization & Performance

The modal system must optimize resources by managing visibility and layering.

### Performance Mode Lifecycle

- **Entrance**: Activate background simplification **IMMEDIATELY** when a modal that obscures the screen begins to open. This avoids visual noise during the transition.
- **Exit**: Restore full background fidelity **IMMEDIATELY** when the last modal begins its `close` animation. This allows the user to see the world return through the fading overlay.

### Immersion and Overflow (Clipping FX)

For cinematic events (Evolution, Hatching), the modal must allow visual effects to overflow its container:

- **Configuration**: Use `overflow: visible !important` and transparent backgrounds in `BaseModal`.
- **Z-Index**: Particle effects must be above the modal content but below the close button.

---

## 6. Verification & Automated Audits

To ensure performance standards are maintained, the project uses automated static analysis:

- **GPU Gap Audit (`audit:full`)**: Running `npm run audit:full` triggers a context-aware scan for GPU best practices.
- **Promotion Check**: The engine detects any usage of `filter` (especially in atmospheric overlays or Premium Shells) that lacks a corresponding `will-change` promotion within a 500-character window.
- **Why**: Static verification prevents "GPU Stutter" in production by ensuring layers are promoted to the compositor BEFORE they are needed for transitions.
- **Manual Verification**: Use the "Layer Borders" and "Paint Flashing" tools in Chrome DevTools to verify that atmospheric overlays (`::after` frames) maintain a single, stable compositor layer.
