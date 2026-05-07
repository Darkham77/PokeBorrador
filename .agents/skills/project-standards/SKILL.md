---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, Zero-Warning SASS/Vue standards, and Zero-Ignore TypeScript policy. Includes diagnostic scripts for automated auditing (viewport, GPU, items). For ANY task involving the battle engine or FSM transitions, you MUST use verify_fsm_diagrams.ts, audit_fsm_implementation.ts, and audit_fsm_flow_parity.ts to ensure 1:1 parity with documentation and zero race conditions. Acts as a Navigation Hub to access technical manuals.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals to ensure a lightweight and effective rule base.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **WIP Audit Documentation**: If the commit is partial or part of an ongoing migration, it is acceptable to commit even with audit failures (SASS, Aesthetics, Length), provided they are explicitly listed in the commit message as "Pending Migrations". This allows work to be synchronized without being blocked by pre-existing technical debt, maintaining traceability.

## 🧭 Navigation Hub

Consult these manuals for detailed implementation specifications:

| Domain | Reference Manual |
| :--- | :--- |
| **Content Creation** | [content_creation_manual.md](./references/content/content_creation_manual.md) |
| **Battle Mechanics** | [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md) |
| **Mechanics & UX** | [game_mechanics_manual.md](./references/core/game_mechanics_manual.md) |
| **UI/UX Standards** | [ui_ux_standards.md](./references/core/ui_ux_standards.md) |
| **Formulas & Ratios** | [game_formulas_manual.md](./references/core/game_formulas_manual.md) |
| **Time & Seasons** | [time_system_manual.md](./references/core/time_system_manual.md) |
| **Breeding (Daycare)** | [breeding_manual.md](./references/systems/breeding_manual.md) |
| **Evolution System** | [evolution_manual.md](./references/systems/evolution_manual.md) |
| **Encounter Systems** | [encounter_manual.md](./references/systems/encounter_manual.md) |
| **Item System** | [item_system_manual.md](./references/systems/item_system_manual.md) |
| **War & Factions** | [war_system_manual.md](./references/systems/war_system_manual.md) |
| **Gyms & Rematch** | [gym_system_manual.md](./references/systems/gym_system_manual.md) |
| **Social & Trade** | [trade_social_manual.md](./references/systems/trade_social_manual.md) |
| **DB Architecture** | [dbrouter_manual.md](./references/technical/dbrouter_manual.md) |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md) |
| **Save & Persistence** | [save_system_manual.md](./references/technical/save_system_manual.md) |
| **Testing & Simulation** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md) |
| **Animations & FX** | [animation_standards.md](./references/battle/animation_standards.md) |
| **GPU & Performance** | [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md) |
| **SASS & Styling** | [sass_styling_manual.md](./references/technical/sass_styling_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/technical/asset_service_manual.md) |
| **Map & Spawns** | [spawn_grid_manual.md](./references/systems/spawn_grid_manual.md) |
| **Combat Camera** | [combat_camera_manual.md](./references/battle/combat_camera_manual.md) |
| **Dependencies** | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |

### 🛠️ Migration & Technical Support

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md)
- **DB Technical Notes**: [references/migration/](./references/migration/)

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: Glassmorphism, gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements MUST use `@include pixelated`. Typography for stats and headers must always be pixelated.

### 2. GPU & Rendering

- **GPU First**: Prioritize hardware-accelerated rendering. See [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md).
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel**: Desynchronize animations using seeds and vary speeds.
- **VFX Integrity**: Apply complex auras (e.g. Guardian/Shiny) to the `.pv-fx-wrapper` instead of the child sprite. This prevents status effect filters (poison/burn) from overriding the aura. Persistent effects MUST decouple their visibility from status flags.

### 3. Modularity & Hierarchy

- **500-Line Rule**: No logic or style file may exceed 500 lines (except for massive databases).
- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Modal Lifecycle**: Synchronize performance mode with modal transitions.
- **Import Hygiene**: When implementing cross-component signals (e.g., calling `loadingStore` from a View), ALWAYS verify the import is present. Missing imports in lifecycle hooks (`onMounted`) are a primary cause of initialization deadlocks.
- **Engine Signaling (Loading Gate)**: Signal "App Mounted" only after the primary Vue views have finished mounting (`onMounted`). The loading veil MUST use `v-if` to be completely purged from the DOM after initialization, preventing blocking layers or performance issues.
- **Dynamic Viewport (Mobile)**: Use `dvh` units (e.g., `100dvh`) for full-screen containers to ensure the UI adapts correctly to mobile browser toolbars without clipping.
- **Decoupled FX (GameBus)**: Trigger non-critical visual effects or multi-component animations via `GameBus.emit()` to avoid direct component-to-component dependencies.
- **Pure Vue Compliance**: Avoid direct DOM/Canvas operations in Vue components. For mandatory performance-critical low-level code (e.g. Canvas generation) or long data structures, use the explicit ignore tags to satisfy the automated audit:
  - `// [PureVue-Ignore]`: Bypasses technical DOM/Window access checks.
  - `// [PureVue-Ignore-Length]`: Bypasses the 500-line limit for data-heavy files.
  - `// [PureVue-Ignore-Aesthetics]`: Bypasses hardcoded color/shadow audits for specialized FX or legacy styles.
- **Unitless Variable Pattern**: When passing coordinates or dynamic sizes from JS to CSS variables, ALWAYS use pure numeric values. Add units in CSS using `calc(var(--val) * 1px)`.
- **Zero Bridges Policy**: The use of `window.state` or any global compatibility bridge (`src/logic/bridges`) is forbidden. All communication must be handled via direct imports (ESM) and dependency injection through Pinia stores. Global state manipulation from the console must be reserved exclusively for `window.__VITE_DEBUG__`.
- **Modular Orchestration (HUD)**: High-complexity visibility logic, snapshots, and combat interface states MUST be extracted to dedicated composables (e.g., `useBattleHud.ts`). The arena view (`BattleArenaView.vue`) must act exclusively as a simplified visual orchestrator.
- **Reactive State Propagation**: When passing state subsets to external logic functions via `reactive({...})`, it is MANDATORY to include all control flags (e.g., `isFinishing`) to prevent the logic engine from making decisions based on incomplete or undefined states.
- **Grid-to-Card Sync**: In grid components (e.g., `MapGrid`), environment-dependent state (weather, cycle) must be calculated once and propagated to children via props (`forced-weather`). This avoids visual desynchronization between the data pool and the interface.
- **Robustness (Deterministic Environment)**: Treat `null` or undefined environmental states as triggers for deterministic calculation, ensuring that atmospheric content (visitors) injection is never skipped.

### 4. SASS and Build Integrity

- **Capitalization Duality**:
  - **SASS Filters**: Use capitalized filters (`Scale()`, `Blur()`, `Brightness()`) to avoid collisions with Dart Sass 2.0 native functions.
  - **Browser Transforms**: Use standard LOWERCASE for CSS transformations (`translate`, `scale`, `rotate`). Capitalizing these may cause browser interpretation failures and break layout positioning.
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`. It is MANDATORY to run `npm run type-check` before `npm run lint`.
- **Template Event Casting**: When using strict TypeScript in `.vue` files, it is mandatory to cast event targets in the template (e.g., `(e.target as HTMLImageElement)`) to satisfy `vue-tsc` checks on specific DOM properties.
- **Dependency Shield**: Scripts using external libraries must handle `ImportError` and provide installation instructions.

### 9. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Verification Workflow**: Always run `npm run type-check` BEFORE `npm run lint` or any commit operation. Type safety is non-negotiable.

### 5. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states. It is MANDATORY to verify new content via CLI before committing.

### 7. Symbolic Documentation & Source of Truth (Zero-Hardcoding)

- **Referential Integrity**: Documentation and manuals MUST avoid hardcoded game constants (e.g., pixel sizes, coordinate values).
- **Source of Truth**: Always point to the centralized logic file (e.g., `spatialCoordinator.ts`) or `visuals.ts` as the owner of the numbers.
- **Relativity**: Explain technical specs using symbolic names (`ENTITY_SIZE_P1/P2`) and logical relationships (`SAFE_ZONE_BOTTOM - ENTITY_SIZE_P1`) rather than absolute values.
- **Z-Index Single Source of Truth**: All visual layering constants MUST be defined in `src/logic/constants/visuals.ts`. The use of JSON files or hardcoded integers is forbidden. SCSS variables in `_variables.scss` must reflect these TS constants.

### 8. Battle Engine Integrity (FSM)

- **Documentation Parity**: The code MUST remain a 1:1 implementation of the Mermaid diagrams in `battle_mechanics_manual.md`.
- **Deterministic Flow**: Avoid naked `setTimeout` calls in combat logic. Use `await new Promise(r => setTimeout(r, ms))` to maintain atomic control.
- **Mandatory Audit**: Run `verify_fsm_diagrams.ts`, `audit_fsm_implementation.ts`, and `audit_fsm_flow_parity.ts` before every commit that touches battle logic. Zero critical errors are allowed.

---

## 🏗️ Artifact Governance (MANDATORY)

To ensure rigor and traceability, every complex task MUST follow the artifact lifecycle:

1. **Planning**: Create `implementation_plan.md`. Wait for "ok" from the user.
2. **Execution**: Maintain `task.md` as the source of truth.
3. **Closure**: Create `walkthrough.md` with evidence (screenshots, test logs) of task success.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **Architectural Reuse**: Have I reused existing components?
- [ ] **GPU Acceleration**: Have I applied layer promotion on heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated and sharp?
- [ ] **CLI-First**: Have I verified the state via console?
- [ ] **Zero-Warning**: Do `npm run lint` and `build` pass without warnings?

## 📊 Diagnostic Tools

Use these scripts to verify project standards:

- `verify_fsm_diagrams.ts`: `npx tsx .agents/skills/project-standards/scripts/verify_fsm_diagrams.ts`. Scans `battle_mechanics_manual.md` Mermaid diagrams and verifies 1:1 mapping against `battleStateMachine.ts` FSM.
- `audit_fsm_implementation.ts`: `npx tsx .agents/skills/project-standards/scripts/audit_fsm_implementation.ts`. Deep audit of the battle engine. Detects race conditions, unimplemented sub-states, and persistence gate integrity.
- `audit_fsm_flow_parity.ts`: `npx tsx .agents/skills/project-standards/scripts/audit_fsm_flow_parity.ts`. Sequential flow auditor. Compares Mermaid diagrams against execution order.
- `validate_items.ts`: `npx tsx .agents/skills/project-standards/scripts/validate_items.ts`. Ensures that changes in items data do not break inventory or combat integrity.
- `detect_gpu_gaps.py`: Scans for missing layer promotion or expensive filters.
- `detect_outline_traps.py`: Detects expensive Quad Drop-Shadow outlines that should be migrated to SVG.
- `detect_viewport_units.py`: Detects legacy `vw`/`vh` units that should be migrated to `dvw`/`dvh`.
- `detect_hybrid_patterns.py`: Scans for UI/Logic identity mismatches.
