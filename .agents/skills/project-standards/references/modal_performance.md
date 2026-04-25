# Modal Management & Performance Synchronization

The modal system must integrate perfectly with the background rendering engine (Phaser/Map) to optimize resources without sacrificing visual fluidity.

## 1. Performance Mode Lifecycle

"Performance Mode" (background simplification, pausing heavy particles) must be synchronized with modal transition animations.

### Entrance Synchronization

- **Rule**: Activate background simplification **AFTER** the entrance animation of the first obscuring modal is complete.
- **Reason**: Prevents the user from seeing the background "disappear" or change abruptly while the modal is still transparent or scaling.

### Exit Synchronization

- **Rule**: Restore full background fidelity **IMMEDIATELY** when the last obscuring modal starts its closing animation (`close` event emission).
- **Reason**: Allows the user to see the full, animated background through the closing overlay (fading), creating a premium sense of continuity.

## 2. Immersion & Clipping FX

For cinematic events (Evolution, Hatching), the modal must allow visual effects to overflow its container.

- **Configuration**: Use `overflow: visible !important` and transparent backgrounds in `BaseModal`.
- **Z-Index**: Particle effects must be managed on layers above modal content but below the close button if it's interactive.

## 3. Layer Stacking (LIFO)

- **Event Isolation**: Always use `@click.stop` on buttons inside stacked modals to prevent accidental closure of lower layers.
- **Layer Penetration**: Ensure `pointer-events: auto` on interactive elements even if they are inside a container with `pointer-events: none` (used to allow background scrolling).
