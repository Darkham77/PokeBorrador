---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, and Zero-Warning SASS/Vue standards. Use this as a Navigation Hub to access technical manuals for Phaser, Database, and Assets.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals to ensure a lightweight and effective rule base.

## 🧭 Navigation Hub

Consult these manuals for detailed implementation specifications:

| Domain | Reference Manual |
| :--- | :--- |
| **Content Creation** | [content_creation_manual.md](./references/content_creation_manual.md) |
| **Battle Mechanics** | [battle_mechanics_manual.md](./references/battle_mechanics_manual.md) |
| **Mechanics & UX** | [game_mechanics_manual.md](./references/game_mechanics_manual.md) |
| **UI/UX Standards** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **Formulas & Ratios** | [game_formulas_manual.md](./references/game_formulas_manual.md) |
| **Item System** | [item_system_manual.md](./references/item_system_manual.md) |
| **War & Factions** | [war_system_manual.md](./references/war_system_manual.md) |
| **Gyms & Rematch** | [gym_system_manual.md](./references/gym_system_manual.md) |
| **Social & Trade** | [trade_social_manual.md](./references/trade_social_manual.md) |
| **DB Architecture** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Validation & Quality** | [validation_manual.md](./references/validation_manual.md) |
| **Save & Persistence** | [save_system_manual.md](./references/save_system_manual.md) |
| **Testing & Simulation** | [browser_testing_manual.md](./references/browser_testing_manual.md) |
| **Phaser & Rendering** | [phaser_guidelines.md](./references/phaser_guidelines.md) |
| **Animations & FX** | [animation_standards.md](./references/animation_standards.md) |
| **GPU & Performance** | [gpu_optimization_manual.md](./references/gpu_optimization_manual.md) |
| **SASS & Styling** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |
| **Map & Spawns** | [spawn_grid_manual.md](./references/spawn_grid_manual.md) |

### 🛠️ Migration & Technical Support

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/legacy_migration_manual.md)
- **DB Technical Notes**: [references/migration/](./references/migration/)

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: Glassmorphism, gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements MUST use `@include pixelated`. Typography for stats and headers must always be pixelated.

### 2. GPU & Rendering

- **GPU First**: Prioritize hardware-accelerated rendering. See [gpu_optimization_manual.md](./references/gpu_optimization_manual.md).
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel**: Desynchronize animations using seeds and vary speeds.

### 3. Modularity & Hierarchy

- **500-Line Rule**: No logic or style file may exceed 500 lines (except for massive databases).
- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Modal Lifecycle**: Synchronize performance mode with modal transitions.

### 4. SASS and Build Integrity

- **Capitalization Mandate**: Use capitalized filters (`Scale()`, `Blur()`, `Linear-Gradient()`) to avoid collisions with Dart Sass 2.0.
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`.
- **Dependency Shield**: Scripts using external libraries must handle `ImportError` and provide installation instructions.

### 5. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states. It is MANDATORY to verify new content via CLI before committing.

---

## 🏗️ Artifact Governance (MANDATORY)

To ensure rigor and traceability, every complex task MUST follow the artifact lifecycle:

1. **Planning**: Create `implementation_plan.md`. Wait for "ok" from the user.
2. **Execution**: Maintain `task.md` as the source of truth.
3. **Closure**: Create `walkthrough.md` with evidence (screenshots, tests) of task success.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **Architectural Reuse**: Have I reused existing components?
- [ ] **GPU Acceleration**: Have I applied layer promotion on heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated and sharp?
- [ ] **CLI-First**: Have I verified the state via console?
- [ ] **Zero-Warning**: Do `npm run lint` and `build` pass without warnings?
