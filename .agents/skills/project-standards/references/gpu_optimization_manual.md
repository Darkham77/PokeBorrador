# GPU Optimization & Performance Manual

This manual details the mandatory techniques for maintaining stable 60 FPS in a high-fidelity visual environment.

## 1. GPU Layer Promotion

All heavy components or those that animate frequently must be promoted to a GPU compositor layer.

- **Mandatory**: Use `@include gpu-layer` on Modals, Overlays, MapCards, PC Box, and HUD.
- **Technique**: This injects `transform: translate3d(0,0,0)` and `backface-visibility: hidden`.
- **Golden Rule**: If an element uses `backdrop-filter: Blur()`, it **MUST** have layer promotion to avoid stuttering.

## 2. Low-Cost Animations

- **Allowed Properties**: `transform` (scale, translate, rotate) and `opacity`.
- **Native Opacity**: NEVER use `filter: Opacity()` for static transparency; use the native `opacity` property to avoid redundant GPU layer creation.
- **Forbidden Properties**: `margin`, `padding`, `width`, `height`, `top`, `left`, `right`, `bottom`.
- **Will-Change**: Use `@include will-animate(transform, opacity)` only on elements with constant animations (e.g., auras, Shiny pulses). Do not abuse, as it consumes video memory.

## 3. Smooth Scroll & Gutter

- **Standard**: Use `@include smooth-scroll`.
- **Zero Scrollbar Gutter**: `scrollbar-gutter: stable` is forbidden. Layouts must be fluid and edge-to-edge.
- **Padding**: Delegate padding to the innermost scrollable component to prevent glow effects from being clipped by the parent container.

## 4. Complexity Management (LOD)

- **LOD (Level of Detail)**: For very long lists (Pokedex, PC Box with 500+ Pokemon), implement virtualization or lazy loading.
- **Memoization**: Use `computed` in Vue to avoid O(N) calculations in every template rendering cycle.

---

## 5. Modal Synchronization & Performance

The modal system must integrate with the background rendering engine (Phaser/Map) to optimize resources.

### Performance Mode Lifecycle

- **Entrance**: Activate background simplification **IMMEDIATELY** when a modal that obscures the screen begins to open. This avoids visual noise during the transition.
- **Exit**: Restore full background fidelity **IMMEDIATELY** when the last modal begins its `close` animation. This allows the user to see the world return through the fading overlay.

### Immersion and Overflow (Clipping FX)

For cinematic events (Evolution, Hatching), the modal must allow visual effects to overflow its container:

- **Configuration**: Use `overflow: visible !important` and transparent backgrounds in `BaseModal`.
- **Z-Index**: Particle effects must be above the modal content but below the close button.
