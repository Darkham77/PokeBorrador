# Phaser Rendering & Performance Standards

This manual defines the technical requirements for maintaining 60FPS and optimal memory usage in the Phaser game engine, specifically for mobile devices.

---

## 🚀 GPU Efficiency & Rendering

To maintain 60FPS on mobile devices, we follow strict rendering rules. Global "draw calls" are the primary enemy.

### 1. Texture Atlas Mandate

- **FORBIDDEN**: Loading individual sprite images (e.g., `scene.load.image('ball', '...')`) for frequently used entities.
- **REQUIRED**: All game assets (UI, NPCs, FX) **MUST** be packed into **Texture Atlases** (using TexturePacker or similar).
- **Reasoning**: This allows Phaser to batch draw calls into a single operation, drastically reducing GPU overhead.
- **FPS Capping**: Always cap Phaser at **60 FPS** in `phaser/config.js` with `forceSetTimeOut: true` to prevent CPU spikes and thermal throttling on high-refresh monitors.

### 2. Culling & Batching

- **Auto-Culling**: Surfaces or objects outside the camera view **MUST** have their `active` and `visible` properties set to `false` or be managed by Phaser's internal culling.
- **Layering**: Group sprites by texture atlas in the scene rendering order to maximize batching efficiency.
- **Filter Cumulative Cost**: Avoid using expensive CSS filters like `backdrop-filter` or `drop-shadow` inside large loops (e.g., map grid icons).
- **Opacity Optimization**: Always prefer the `opacity: X` property over the `filter: opacity(X)` function. The property is significantly cheaper for the GPU and avoids SASS deprecation warnings.
- **Lightweight Rendering Mode**: To maximize performance during CPU/GPU-intensive scenes, non-essential background components must implement conditional rendering. For the specific rules on what content is hidden and when, see [game_rules_manual.md](./game_rules_manual.md).

---

## 📱 Mobile Optimization & Memory

Mobile browsers have limited memory and aggressive garbage collection.

### 1. Object Pooling

- **MANDATORY**: Any entity that is frequently created/destroyed (bullets, particles, floating text, wild pokemon encounters) **MUST** use an **Object Pool**.
- **Implementation**: Use `Phaser.GameObjects.Group` with `classType` and `runChildUpdate: true`. Reclaim objects using `killAndHide()`.

### 2. Adaptive Resolution & Input

- **DPR Scaling**: Use `window.devicePixelRatio` to set the game resolution. Avoid scaling a tiny canvas to a giant screen; use Phaser's `ScaleManager` with `RESIZE` or `FIT`.
- **Touch-First UI**: Interactive elements **MUST** have a minimum hit area of 44x44px. Use `pointerup` instead of `pointerdown` for primary actions to allow for scroll cancellation.

---

## 🌉 Phaser + Vue Integration Rules

To avoid performance death by a thousand reactivity "checks":

- **Store Decoupling**: DO NOT store large Phaser objects (Scenes, GameObjects, Sprites) inside reactive Vue refs or Pinia state.
- **The Bridge Pattern**: Use an event bus or a non-reactive "Game Instance Router" to pass data from Vue to Phaser.
- **Shallow Refs**: If you must store the Phaser Game instance in a Vue component, use `shallowRef()`.
- **Global Debugging Bridge**: To facilitate runtime auditing of textures, memory, and engine state, the `phaserBridge` **MUST** be exposed to the global `window` object in the development environment. Use `window.phaserBridge.game.textures.list` in the console to verify asset loading.

### 3. Initialization & Blocking

- **CRITICAL**: The `PhaserGame` component MUST be rendered in the DOM for the engine to initialize and fire the `game-state-ready` event.
- **FORBIDDEN**: Wrapping `PhaserGame` in a `v-if` condition that depends on the engine being ready (circular dependency). This will block the application indefinitely in a loading state.
- **PATTERN**: Always render the engine once the user is authenticated, and hide it behind a loading overlay until the `ready` signal is received.

---

## 🛠️ Performance Audit Checklist

If your changes involve any game scenes or entities, you **MUST** verify:

1. `[ ]` **Asset Check**: Are all new sprites part of a Texture Atlas?
2. `[ ]` **Memory Check**: If spawning entities, is an Object Pool being used?
3. `[ ]` **Reactivity Check**: Are Phaser objects kept out of Vue's reactive state (refs/Pinia)?
