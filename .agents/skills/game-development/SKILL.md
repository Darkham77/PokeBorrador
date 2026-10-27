---
name: game-development
description: >-
  Game development orchestrator for Poké Vicio. Use whenever the user asks to design or build game
  mechanics, 2D sprites, tilemaps, atmospheric weather effects, adaptive game audio, multiplayer
  networking, or game UI patterns. Delegates universal software architecture to /architecture and
  Poké Vicio domain rules to /project-standards, while routing to specialized game design, art,
  audio, and web-game references.
---

# Game Development

> **Orchestrator skill** that provides core game engineering principles and routes to specialized sub-skills.

---

## When to Use This Skill

You are working on **Poké Vicio** (a hybrid retro-modern 2D web video game built with Vue 3, Pinia, GSAP, and `@pkmn/sim`).

> [!IMPORTANT]
> **Mandatory Architectural & Domain Governance**:
>
> 1. Always invoke and enforce **`/architecture`** (`@/architecture`) for the 6 Mandatory Design Pillars (`/domain-type-first`, `/clean-code`, `/dox-navigator`, `/ponytail`, `/auditor`, `/fallow`) and `/systematic-debugging`.
> 2. Consult [`/project-standards`](../project-standards/SKILL.md) and the [Battle Mechanics Manual](../project-standards/references/battle/battle_mechanics_manual.md) for Poké Vicio's GSAP zero-timer animations, 4-seat Showdown harness, and engine rules.

---

## Sub-Skill Routing

### Platform & Dimension Selection

| If the task targets...                 | Use Reference             |
| :------------------------------------- | :------------------------ |
| Web browsers (HTML5, Canvas, WebGL/GPU) | [web-games.md](./references/web-games.md) |
| 2D games (sprites, tilemaps, pixel art) | [2d-games.md](./references/2d-games.md)   |
| 3D reference patterns (if applicable)   | [3d-games.md](./references/3d-games.md)   |

### Specialty Areas

| If you need...                          | Use Reference                                           |
| :-------------------------------------- | :------------------------------------------------------ |
| GDD, balancing, player psychology       | [game-design.md](./references/game-design.md)           |
| Multiplayer, networking                 | [multiplayer.md](./references/multiplayer.md)           |
| Visual style, asset pipeline, animation | [game-art.md](./references/game-art.md)                 |
| Atmospheric & Weather Effects           | [atmospheric_effects.md](./references/atmospheric_effects.md) |
| Sound design, music, adaptive audio     | [game-audio.md](./references/game-audio.md)             |

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

| Pattern             | Use When                      | Example                |
| :------------------ | :---------------------------- | :--------------------- |
| **State Machine**   | 3-5 discrete states           | Player: Idle→Walk→Jump |
| **Object Pooling**  | Frequent spawn/destroy        | Bullets, particles     |
| **Observer/Events** | Cross-system communication    | Health→UI updates      |
| **ECS**             | Thousands of similar entities | RTS units, particles   |
| **Command**         | Undo, replay, networking      | Input recording        |
| **Behavior Tree**   | Complex AI decisions          | Enemy AI               |
| **Singleton Scene** | Prevent double-mount          | Weather, Global FX     |

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

| System     | Budget |
| :--------- | :----- |
| Input      | 1ms    |
| Physics    | 3ms    |
| AI         | 2ms    |
| Game Logic | 4ms    |
| Rendering  | 5ms    |
| Buffer     | 1.67ms |

**Optimization Priority:**

1. Algorithm (O(n²) → O(n log n))
2. Batching (reduce draw calls via Spritesheets or batched rendering)
3. Pooling (avoid GC spikes)
4. LOD (detail by distance)

### 5. UI Determinism & 100% ID Locators Mandate

Every interactive UI element in the game (buttons, inputs, dropdowns, switches, tabs, modals, card controls) MUST have an explicit, unique, and deterministic `id` or `:id` attribute.

- **Mandatory ID on All Interactive UI Elements**: Never render interactive controls without an explicit `id` (e.g., `id="battle-switch-btn"`, `:id="'event-participate-btn-' + event.id"`).
- **100% ID-Based Interaction**: In automated tests, Playwright E2E simulations, and debugging scripts, every interaction with UI controls MUST be located strictly by their unique ID selector (`#<id>` or `[id="..."]` / `data-pokemon-uid`).
- **Prohibition on Text / Class Selectors**: Interacting with UI elements via text content matching (`hasText`, innerText strings) or generic CSS class hierarchies is STRICTLY FORBIDDEN to eliminate translation flakes, font rendering desyncs, and layout refactoring breaks.

---

## Anti-Patterns (Universal)

| Don't                                 | Do                                       |
| :------------------------------------ | :--------------------------------------- |
| Update everything every frame         | Use events, dirty flags                  |
| Create objects in hot loops           | Object pooling                           |
| Cache nothing                         | Cache references                         |
| Optimize without profiling            | Profile first                            |
| Mix input with logic                  | Abstract input layer                     |
| Interactive UI without explicit ID    | Always define deterministic `id` / `:id` |
| Locate UI controls by text or classes | Locate strictly by `#<id>` or `[id=...]` |

---

> **Remember:** Great games come from iteration, not perfection. Prototype fast, then polish.
