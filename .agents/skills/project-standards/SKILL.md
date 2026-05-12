---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 300/500-line modularity (SRP focus), Zero-Warning SASS/Vue standards, and Zero-Ignore TypeScript policy. Strictly prohibits the use of timers (setTimeout) or reactive state variables for animation coordination in favor of GSAP timelines and promises. Includes diagnostic scripts for automated auditing (viewport, GPU, items). For ANY task involving the battle engine or FSM transitions, you MUST use validate_fsm_diagrams.ts, validate_fsm_implementation.ts, and validate_fsm_flow_parity.ts to ensure 1:1 parity with documentation and zero race conditions. Acts as a Navigation Hub to access technical manuals.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals to ensure a lightweight and effective rule base.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **WIP Audit Documentation**: If the commit is partial or part of an ongoing migration, it is acceptable to commit even with audit failures (SASS, Aesthetics, Length), provided they are explicitly listed in the commit message as "Pending Migrations". This allows work to be synchronized without being blocked by pre-existing technical debt, maintaining traceability.

## 🧭 Navigation Hub

Consult these manuals for detailed implementation specifications:

| Domain                   | Reference Manual                                                                          |
| :----------------------- | :---------------------------------------------------------------------------------------- |
| **Content Creation**     | [content_creation_manual.md](./references/content/content_creation_manual.md)             |
| **Battle Mechanics**     | [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md)              |
| **Mechanics & UX**       | [game_mechanics_manual.md](./references/core/game_mechanics_manual.md)                    |
| **UI/UX Standards**      | [ui_ux_standards.md](./references/core/ui_ux_standards.md)                                |
| **Formulas & Ratios**    | [game_formulas_manual.md](./references/core/game_formulas_manual.md)                      |
| **Time & Seasons**       | [time_system_manual.md](./references/core/time_system_manual.md)                          |
| **Node 26+ Standards**   | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |
| **Breeding (Daycare)**   | [breeding_manual.md](./references/systems/breeding_manual.md)                             |
| **Evolution System**     | [evolution_manual.md](./references/systems/evolution_manual.md)                           |
| **Encounter Systems**    | [encounter_manual.md](./references/systems/encounter_manual.md)                           |
| **Item System**          | [item_system_manual.md](./references/systems/item_system_manual.md)                       |
| **War & Factions**       | [war_system_manual.md](./references/systems/war_system_manual.md)                         |
| **Gyms & Rematch**       | [gym_system_manual.md](./references/systems/gym_system_manual.md)                         |
| **Social & Trade**       | [trade_social_manual.md](./references/systems/trade_social_manual.md)                     |
| **DB Architecture**      | [dbrouter_manual.md](./references/technical/dbrouter_manual.md)                           |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md)                              |
| **Save & Persistence**   | [save_system_manual.md](./references/technical/save_system_manual.md)                     |
| **Testing & Simulation** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md)                    |
| **Animations & FX**      | [animation_standards.md](./references/battle/animation_standards.md)                      |
| **GPU & Performance**    | [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md)           |
| **SASS & Styling**       | [sass_styling_manual.md](./references/technical/sass_styling_manual.md)                   |
| **Asset Pipeline**       | [asset_service_manual.md](./references/technical/asset_service_manual.md)                 |
| **Map & Spawns**         | [spawn_grid_manual.md](./references/systems/spawn_grid_manual.md)                         |
| **Combat Camera**        | [combat_camera_manual.md](./references/battle/combat_camera_manual.md)                    |
| **Dependencies**         | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |

### 🛠️ Migration & Technical Support

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md)
- **DB Technical Notes**: [references/migration/](./references/migration/)

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: High-contrast solid backgrounds, premium gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements (sprites, items, badges) MUST use `@include pixelated`. This mixin handles browser fallbacks and typography sharpening. Typography for stats and headers must always be pixelated.

### 2. GPU & Rendering

- **GPU First**: Prioritize hardware-accelerated rendering. See [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md). GPU promotion (`will-change`) MUST be context-aware; only add it if a `filter` or `transform` is present and no other `will-change` exists within the same block (500-character window) to avoid redundancy and memory overhead.
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel**: Desynchronize animations using seeds and vary speeds.
- **VFX Integrity**: Apply complex auras (e.g. Guardian/Shiny) to the `.pv-fx-wrapper` instead of the child sprite. This prevents status effect filters (poison/burn) from overriding the aura. Persistent effects MUST decouple their visibility from status flags.
- **GSAP Exclusive Mandate**: All animations in the project (UI transitions, battle effects, map movements, atmospheric FX) MUST be implemented using GSAP. The use of CSS `@keyframes`, transitions, or `setTimeout`/`setInterval` for animation flow is STRICTLY FORBIDDEN.
- **Zero-Timer & Zero-Variable Policy**: It is STRICTLY FORBIDDEN to use `setTimeout` or numeric timers to wait for visual completion. Sequential animation coordination MUST NOT be handled via reactive state variables (e.g., boolean flags or counters). You MUST use GSAP's native deterministic orchestration: timelines, promises (`await tween`), or `onComplete` callbacks.
- **Deterministic Orchestration**: Visual sequences MUST return a Promise (using `awaitAnimation` or GSAP timelines) so the state machine can synchronize state changes with visual completion.
- **CLI-Ready Visuals**: Every animation MUST be triggerable via `window.__VITE_DEBUG__.battle.animations` (or the corresponding debug bridge) to allow headless verification.

### 3. Modularity & Hierarchy

- **300/500-Line Rule**: Modularization MUST be proactive. Files exceeding **300 lines** should be reviewed for logic extraction into Composables (SRP focus). No logic or style file may exceed **500 lines**.
  - _Exemption_: Massive databases, metadata files (`*Metadata.ts`, `*DB.ts`), and modules in `src/data/` are exempt to maintain data cohesion.

- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Centralized Formatters**: All numeric formatting logic (currency, large numbers, suffixes) MUST be centralized in `src/logic/utils/formatters.ts`. Direct use of `toLocaleString()` in components for currency is deprecated in favor of `formatCurrency()`.
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
- **DBRouter Context Isolation**: Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts. Persistence logic migrations must strictly respect the `DBRouter` routing rules to prevent data pollution.
- **Atomic Batching**: Large migrations or refactors MUST be performed in atomic batches (single files or small logical groups) to manage context limits and ensure precision. Avoid directory-wide mass processing in a single step.
- **Pure Modules Pattern (Math Extraction)**: Core mathematical logic (battle formulas, weather cycles, stats calculation) MUST be extracted into standalone `*Math.ts` files. These modules must be "pure" (zero side effects, zero dependence on Vue/Pinia/Supabase). This allows using the high-performance Native Node.js Test Runner and ensures logic remains deterministic and portable.

### 4. SASS and Build Integrity

- **Unified SASS Trap Engine**: Capitalization of standard CSS/SASS functions (e.g., `scale`, `rotate`, `translate` -> `Scale()`, `Rotate()`, `Translate()`) is handled **automatically** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR (Hot Module Replacement) and build. Therefore, developers and agents can write standard lowercase CSS/SASS functions, and Vite will automatically format and capitalize them. No manual capitalization or standalone scripts are required.
- **Audit Exemptions**: Utility, maintenance, and migration scripts (located in `scripts/`) are EXEMPT from legacy code audits (e.g., `legacyDates`) to allow technical support tasks without false positives.
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`. It is MANDATORY to run `npm run validate:types` before `npm run lint`.
- **Template Event Casting**: When using strict TypeScript in `.vue` files, it is mandatory to cast event targets in the template (e.g., `(e.target as HTMLImageElement)`) to satisfy `vue-tsc` checks on specific DOM properties.
- **Dependency Shield**: Scripts using external libraries must handle `ImportError` and provide installation instructions.
  - **Node.js 26+ Native Standards**:
    - **Temporal API**: The legacy `Date` object is DEPRECATED for engine logic and timestamps. Use `Temporal` for all precise timing and durations.
      - **Native-First Architecture**: Follow a "Native-First" approach by loading the `@js-temporal/polyfill` conditionally via `src/logic/utils/temporal-init.ts`. Global types MUST be provided via `tsconfig.json` (types array) and `src/types/env.d.ts` (global augmentation) instead of local imports to prevent namespace conflicts between native and polyfill types.
      - **BigInt Precision**: When performing calculations with nanosecond precision (`epochNanoseconds`), ALWAYS use explicit `BigInt()` casts (e.g., `BigInt(instant.epochNanoseconds)`) to ensure consistency across all IDEs and TypeScript environments.
      - **Atomicity**: To prevent time inconsistencies (clock skew/race conditions) and unnecessary system calls/allocations when chaining time formatting, always capture a single Temporal instance in a constant (e.g., `const now = Temporal.Now.instant().toZonedDateTimeISO('UTC')`) and perform subsequent calculations/formatting on that single instance.
    - **Map Upsert**: Use `Map.prototype.getOrInsertComputed` (or native patterns) for efficient cache lookups.
    - **Native Test Runner**: Use `node:test` for all pure logic unit tests (`npm run test:node`). This avoids the overhead of JSDOM/Vitest for non-UI logic.
    - **Extension-First Imports**: When running tests or scripts via `node --experimental-strip-types`, all internal imports MUST include the `.ts` extension (e.g., `import { foo } from './bar.ts'`) to ensure resolution by the native loader.
    - **Permissions**: All maintenance scripts MUST adhere to the Node.js Permission Model (`--permission`). Utility scripts performing fetch/read/write must be restricted to their necessary scopes (e.g., `--allow-net`, `--allow-fs`).
    - **Resource Management**: Use the `using` keyword (Explicit Resource Management) for DB connections and file handles.

### 5. Integrity & Quality Enforcement

The project uses a sophisticated audit and validation engine to ensure stability and modern standards.

- **Mandatory Audit Pipeline**: Running `npm run audit:full` is MANDATORY before any commit or delivery. This pipeline orchestrates:
  - **Intelligent Audit (`audit:fix`)**: Automates SASS capitalization, GPU promotion, and Node 26+ syntax migration.
  - **SQL Parity (`validate:sql`)**: Validates migrations using native SQLite engines.
  - **Semantic Validation**: Synchronizes Moves, Abilities, and Items against PokeAPI/Official Data to prevent data drift.
  - **FSM Mastery (`validate:fsm`)**: Ensura 1:1 parity between battle logic and FSM documentation (diagrams, implementation, flow).
- **Zero-Warning Policy**: Zero errors and zero warnings are required for any core system component.
  - **Native TS**: Prefer `node --experimental-strip-types` for running utility scripts instead of `tsx`/`ts-node` when possible.
  - **Module Prefix**: Use the `node:` prefix for all built-in module imports (e.g., `import fs from 'node:fs'`).

### 9. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Verification Workflow**: Always run `npm run validate:types` BEFORE `npm run lint` or any commit operation. Type safety is non-negotiable.
- **JSDoc Integrity**: When editing code (especially via `multi_replace_file_content`), ALWAYS verify the preservation of the `/**` opening tags. Deleting these tags breaks JSDoc transformation in esbuild/vite and leads to documentation/type generation failures.
- **IDE & Workspace Config**: To ensure the IDE (like VS Code) applies the proper TypeScript program context and resolves development imports (e.g., `@vitejs/plugin-vue`) inside configuration files (e.g., `vite.config.ts`), these files must be explicitly declared in the root `tsconfig.json`'s `"include"` array.
- **Temporal API Typings**: For robust type-safety without using `any`, any custom or polyfilled Temporal API properties (e.g., accessing year/month/day/hour/minute on the return value of `toZonedDateTimeISO()`) must be explicitly declared with formal types (like `ZonedDateTime` interface/class) inside the global `env.d.ts` instead of typing them as `unknown` or `any`.
- **TypeScript Import Rigor**: Triple-slash references (e.g., `/// <reference types="vue" />`) are forbidden in `vite-env.d.ts` or any core file. Use standard ESM imports or `compilerOptions.types` in `tsconfig.json`.

### 5. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states. It is MANDATORY to verify new content via CLI before committing.
- **Windows CLI Compatibility**: When chaining commands in PowerShell (default Windows CLI), avoid the `&&` operator; use `;` or run commands sequentially to ensure cross-platform stability.
- **Standardized Logging (HybridLogger)**: Consolidation of `HybridLogger` with context tags (e.g., `[Battle]`, `[GTS]`, `[Chat]`) is MANDATORY. This ensures "Zero-Log" production standards while maintaining CSS styling in browsers and ANSI in terminals. Direct `console.log` is FORBIDDEN in production-bound logic.

### 7. Symbolic Documentation & Source of Truth (Zero-Hardcoding)

- **Referential Integrity**: Documentation and manuals MUST avoid hardcoded game constants (e.g., pixel sizes, coordinate values).
- **Source of Truth**: Always point to the centralized logic file (e.g., `spatialCoordinator.ts`) or `visuals.ts` as the owner of the numbers.
- **Relativity**: Explain technical specs using symbolic names (`ENTITY_SIZE_P1/P2`) and logical relationships (`SAFE_ZONE_BOTTOM - ENTITY_SIZE_P1`) rather than absolute values.
- **Z-Index Single Source of Truth**: All visual layering constants MUST be defined in `src/logic/constants/visuals.ts`. The use of JSON files or hardcoded integers is forbidden. SCSS variables in `_variables.scss` must reflect these TS constants.

### 8. Battle Engine Integrity (FSM)

- **Documentation Parity**: The code MUST remain a 1:1 implementation of the Mermaid diagrams in `battle_mechanics_manual.md`.
- **Deterministic Flow**: Avoid naked `setTimeout` calls in combat logic. Initialization sequences and FSM state transitions MUST be strictly synchronized with `await animations.triggerX()` or GSAP promises to prevent engine deadlocks and race conditions. Hardcoded timers for animation waiting are forbidden.
- **Visual Completion**: FSM states representing visual actions (Damage, Faint, Catch) MUST wait for the corresponding GSAP promise resolution.
- **Mandatory Audit**: Run `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts` (or `npm run validate:fsm`) before every commit that touches battle logic. Zero critical errors are allowed.
- **Substate Parity**: All sub-states defined in `battleStateMachine.ts` MUST be actively used in logic or UI. Obsolete or orphaned states (e.g., `REORDER_TEAM`) must be removed to maintain a clean FSM audit and prevent architectural drift.

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

Use these scripts to verify project standards and ensure stability:

### 🛡️ Core Validation

- `npm run validate:types`: TypeScript type integrity verification (Zero Errors).
- `npm run validate:sql`: SQL schema and migration validator against local engine.
- `npm run validate:items`: Integrity audit for item and object databases.
- `npm run audit`: Unified standards scan (Viewports, GPU, SASS filters).
- `npm run audit:fix`: Automatic standards repair (Node prefixes, Viewports).
- `npm run audit:full`: **THE GOLD STANDARD**. Total audit (Code + FSM + Items + SQL + Abilities + Moves). MANDATORY before any commit.
- `npm run lint`: Style and syntax verification (includes type-check).

### ⚔️ Battle Engine (FSM Mastery)

- `npm run validate:fsm:diagrams`: 1:1 parity verifier between code and Mermaid diagrams.
- `npm run validate:fsm:implementation`: Deep audit of FSM architectural layers.
- `npm run validate:fsm:flow`: State sequence verifier and race condition detection.
- `npm run validate:fsm`: Unified FSM Mastery Audit (Diagrams + Implementation + Flow).

### 🖼️ Assets

- `npm run assets:convert`: Unified pipeline for WebP conversion and mirroring.
- `npm run assets:download`: External sprite downloader (PokeAPI/Showdown).
