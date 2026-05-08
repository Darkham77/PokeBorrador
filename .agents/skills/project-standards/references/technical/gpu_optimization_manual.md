# GPU Optimization & Performance Manual

This manual details the mandatory techniques for maintaining stable 60 FPS in a high-fidelity visual environment.

## 1. GPU Layer Promotion

All heavy components or those that animate frequently must be promoted to a GPU compositor layer.

- **Mandatory**: Use `@include gpu-layer` on Modals, Overlays, MapCards, PC Box, and HUD.
- **Technique**: This injects `transform: translate3d(0,0,0)` and `backface-visibility: hidden`.
- **Golden Rule**: If an element uses `backdrop-filter: Blur()`, it **MUST** have layer promotion to avoid stuttering.
- **Visibility Trap**: NEVER use `visibility: hidden` to hide an element that has `backdrop-filter` or heavy glassmorphism. This causes the browser to discard the GPU layer; when it becomes `visible` again, the re-paint happens sequentially across frames (glitch). Use `opacity: 0` and `pointer-events: none` instead to keep the layer "warm" in the compositor.
- **Layer Consolidation**: Avoid redundant layer promotion. If a parent (e.g., `BoxPokemonCard`) is already accelerated, do NOT apply `@include gpu-layer` or `will-change` to its children (e.g., Auras). Managing 100+ overlapping layers causes "Scroll-Stop Freezes" during compositor cleanup.
- **Context-Aware will-change**: Automated tools and manual implementations MUST check the surrounding block (approx. 500 characters). Only add `will-change` if a `filter` or `transform` exists and NO other `will-change` is present in that context. Duplicate declarations lead to bloated CSS and memory waste.

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
  - **Detection**: Run `.agents/skills/project-standards/scripts/audit/detect_outline_traps.py` to identify legacy outlines that require migration to SVG.
- **Will-Change**: Use `@include will-animate(transform, opacity)` only on elements with constant animations (e.g., auras, Shiny pulses). Do not abuse, as it consumes video memory.

## 3. Smooth Scroll & Gutter

- **Standard**: Use `@include smooth-scroll`.
- **Zero Scrollbar Gutter**: `scrollbar-gutter: stable` is forbidden. Layouts must be fluid and edge-to-edge.
- **Padding**: Delegate padding to the innermost scrollable component to prevent glow effects from being clipped by the parent container.

## 4. Complexity Management (LOD)

- **LOD (Level of Detail)**: For very long lists (Pokedex, PC Box with 500+ Pokemon), implement virtualization or lazy loading.
- **Memoization**: Use `computed` in Vue to avoid O(N) calculations in every template rendering cycle.
- **Layout Thrashing Prevention**: Do NOT update dimensions or read `offsetHeight` during an active transition or high-frequency scroll.
- **Atomic State Updates**: Ensure that visibility changes (e.g., `isHudHidden`) are atomic and don't trigger simultaneous layout calculations from other reactive dependencies.
- **Zero-Reactivity Scroll**: For scroll-time optimizations (like hiding FX), avoid Vue reactivity (e.g., `isScrolling` ref). Use a direct DOM class (`classList.add('is-scrolling')`) on the container. This prevents a "Reactivity Wave" that re-renders all list items simultaneously, causing frame drops.

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
