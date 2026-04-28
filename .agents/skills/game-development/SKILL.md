---
name: game-development
description: Game development orchestrator. YOU MUST use this skill whenever the user asks to build a game, mentions Phaser, game design, multiplayer networking, sprites, 2D/3D development, or anything related to game engines and mechanics. Routes to platform-specific references based on project needs.
---

# Game Development

> **Orchestrator skill** that provides core principles and routes to specialized sub-skills.

---

## When to Use This Skill

You are working on a game development project. This skill teaches the PRINCIPLES of game development and directs you to the right sub-skill based on context.

> [!IMPORTANT]
> Si estás trabajando en **Poké Vicio**, DEBES consultar adicionalmente el [Manual de Mecánicas y UX de Juego](../project-standards/references/game_mechanics_manual.md) para reglas específicas del motor y la interfaz.

---

## Sub-Skill Routing

### Platform Selection

| If the game targets... | Use Sub-Skill |
| :--- | :--- |
| Web browsers (HTML5, WebGL) | `references/web-games.md` |
| Mobile (iOS, Android) | `references/mobile-games.md` |
| PC (Steam, Desktop) | `references/pc-games.md` |
| VR/AR headsets | `references/vr-ar.md` |

### Dimension Selection

| If the game is... | Use Sub-Skill |
| :--- | :--- |
| 2D (sprites, tilemaps) | `references/2d-games.md` |
| 3D (meshes, shaders) | `references/3d-games.md` |

### Specialty Areas

| If you need... | Use Sub-Skill |
| :--- | :--- |
| GDD, balancing, player psychology | `references/game-design.md` |
| Multiplayer, networking | `references/multiplayer.md` |
| Visual style, asset pipeline, animation | `references/game-art.md` |
| Atmospheric & Weather Effects | `references/atmospheric_effects.md` |
| Sound design, music, adaptive audio | `references/game-audio.md` |

---

## Core Principles (All Platforms)

### 1. The Game Loop

Every game, regardless of platform, follows this pattern:

```text
INPUT  → Read player actions
UPDATE → Process game logic (fixed timestep)
RENDER → Draw the frame (interpolated)
```

**Fixed Timestep Rule:**

- Physics/logic: Fixed rate (e.g., 50Hz)
- Rendering: As fast as possible
- Interpolate between states for smooth visuals

---

### 2. Pattern Selection Matrix

| Pattern | Use When | Example |
| :--- | :--- | :--- |
| **State Machine** | 3-5 discrete states | Player: Idle→Walk→Jump |
| **Object Pooling** | Frequent spawn/destroy | Bullets, particles |
| **Observer/Events** | Cross-system communication | Health→UI updates |
| **ECS** | Thousands of similar entities | RTS units, particles |
| **Command** | Undo, replay, networking | Input recording |
| **Behavior Tree** | Complex AI decisions | Enemy AI |
| **Singleton Scene** | Prevent double-mount | Weather, Global FX |

**Decision Rule:** Start with State Machine. Add ECS only when performance demands.

---

### 3. Input Abstraction

Abstract input into ACTIONS, not raw keys:

```text
"jump"  → Space, Gamepad A, Touch tap
"move"  → WASD, Left stick, Virtual joystick
```

---

### 4. Performance Budget (60 FPS = 16.67ms)

| System | Budget |
| :--- | :--- |
| Input | 1ms |
| Physics | 3ms |
| AI | 2ms |
| Game Logic | 4ms |
| Rendering | 5ms |
| Buffer | 1.67ms |

**Optimization Priority:**

1. Algorithm (O(n²) → O(n log n))
2. Batching (reduce draw calls via Texture Atlases)
3. Pooling (avoid GC spikes)
4. LOD (detail by distance)
5. Culling (skip invisible)

---

## Anti-Patterns (Universal)

| Don't | Do |
| :--- | :--- |
| Update everything every frame | Use events, dirty flags |
| Create objects in hot loops | Object pooling |
| Cache nothing | Cache references |
| Optimize without profiling | Profile first |
| Mix input with logic | Abstract input layer |

---

> **Remember:** Great games come from iteration, not perfection. Prototype fast, then polish.
