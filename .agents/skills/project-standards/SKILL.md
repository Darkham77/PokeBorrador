---
name: project-standards
description: >-
  Core domain governance, workspace environment setup, and Poké Vicio architectural standards.
  Delegates universal software architecture, static analysis, and debugging protocols to /architecture,
  while governing Poké Vicio specifics: Hybrid Retro-Modern identity, GSAP zero-timer animations,
  4-seat Showdown battle harness, DBRouter persistence isolation, asset pipeline, and the 7-tier
  documentation navigation hub. Load whenever updating or preparing the working environment/dependencies,
  starting new tasks, modifying core engine/stores/components, refactoring, writing tests, or reviewing
  project standards.
---

# Project Standards (Core Governance & Navigation Hub)

This skill defines the domain-specific DNA, workspace setup, and architectural standards of **Poké Vicio**, as well as the navigation hub for its specialized reference manuals.

## 🏛️ Mandatory Delegation to `/architecture` (Universal Foundation)

> [!IMPORTANT]
> **Explicit Skill Invocation Mandate (`/architecture`)**:
> Before designing systems, planning tasks, writing or refactoring code, running audits, or debugging failures, you **MUST explicitly invoke and enforce the `/architecture` skill (`@/architecture`)**.
>
> All universal rules formerly duplicated in this document are now governed strictly by **`/architecture`** as the Single Source of Truth:
>
> 1. **The 6 Mandatory Design Pillars**:
>    - **`/domain-type-first`**: Zero `any`, zero `unknown`, zero `@ts-ignore`/`@ts-nocheck`, zero naked strings for finite domains, zero type assertion bypasses (`as Type`), `as const` compile-time unions, and $O(1)$ lookup structures (`ReadonlySet<T>`, `Record<DomainId, T>`).
>    - **`/clean-code`**: Single responsibility, cognitive complexity $\le 20$, cyclomatic $\le 25$, zero magic numbers (`readonly` named constants without hardcoded values in names), and zero code duplication.
>    - **`/dox-navigator`**: Mandatory DOX indexation (`AGENTS.md` hierarchy) with relative links and language integrity.
>    - **`/ponytail`**: Anti-overengineering (YAGNI & KISS), native platform APIs first.
>    - **`/auditor`**: Official CLI tools priority (`npm run auditor:next`, `auditor:findings`, `auditor:rules`, `auditor:by-rule`, `auditor:by-file`, `auditor:dupes`, `auditor:magic`, `auditor:motion`, `auditor:o1`, `auditor:types`, `auditor:domain`, `auditor:fix`). Prohibits premature scratch scripts, inline `node -e` commands, and raw JSON reading of `scratch/audits/latest_audit.json`.
>    - **`/fallow`**: Architecture boundaries, circular dependency detection, dead code elimination, semantic duplication, and CWE security audits (zero security-hiding ignores).
> 2. **Primary Debugging & Triage Guide**:
>    - **`/systematic-debugging`**: **RED-GREEN First Mandate (Gate 1 Inviolable)** — modifying `src/` without an isolated reproduction test failing deterministically in RED is strictly prohibited. Enforces the 4-phase reactive lifecycle, dual consultation gate, and zero hasty patches/fallbacks.
> 3. **Universal Core Invariants**:
>    - Decoupled layers, `.auditor/audit.config.ts` as SSoT, Fail Loud & Fast, Node.js 26+ native standard library (`node:path`, `node:fs`), `citty` CLI contracts, `skills-lock.json` isolation, dependency-to-skill synchronization, and the **Daily Verification Cadence** (`npm run auditor:lint` fast inner loop vs. `npm run auditor` work-complete outer gate vs. `npm run auditor:full` / `npm run build` release gate).

---

## ⚙️ Workspace Environment & Project-Specific Operational Mandates

- **All-in-One Environment Setup & Workspace Update Mandate**: Whenever instructed to initialize, configure, or update the workspace/environment (e.g. _"actualiza el entorno de trabajo"_, _"actualizar entorno"_, _"preparar el entorno"_, _"setup environment"_), the single-command source of truth is the root setup script:
  - **Windows (PowerShell as Admin / Terminal)**: `PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1 [-DeclaredVersions]`
  - **Linux / macOS (Terminal)**: `chmod +x ./setup-linux.sh && ./setup-linux.sh [--declared-versions]`
    This script automatically prompts and elevates Administrator permissions via the native Windows UAC modal dialog (`setup-windows.ps1`) or sudo when required, installs/configures NVM, aligns the Node runtime, preserves the user default NVM alias and other installed Node versions, enforces local `.npmrc` security policies (`ignore-scripts=true`, HTTPS registry, high audit level), cleans residual cache, and runs `npm ci` for a deterministic, ready-to-code workspace in a single run. By default in development, it automatically checks nodejs.org for the latest Current stable Node.js release, synchronizes `.node-version` (with fallback to `.nvmrc`) and `package.json`, and updates `npm@latest` globally. For servers, CI/CD, or reproducible locked runs, passing `--declared-versions` / `-DeclaredVersions` (aliases `--locked`, `--pinned`) freezes installation strictly to versions declared in the commit without network queries, without mutating Git-tracked files, and without updating npm.
  - **IDE & Terminal Restart Recommendation**: Whenever setup scripts modify system/user environment variables, NVM symlinks, or PATH, the agent MUST explicitly advise the user to restart their IDE (or reload terminal windows) so that all child process trees inherit the updated system PATH, eliminating the need for manual PATH injections in subsequent tool executions.
- **Strict No-Test Mandate for Documentation**: Running test suites (`npm run test`, `test:node`, Vite+, or E2E Playwright simulations) or heavy project audits (`npm run lint`, `npm run auditor`) when only editing `.md` documents, DOX indices, or `.agents/` skill files is STRICTLY FORBIDDEN. Verification for documentation tasks is strictly limited to the unified documentation audit `npm run auditor:md` (~1–2s).
- **Build & Bundle Diagnostics**: `npm run build:analyze` is the official Single Source of Truth command for bundle analysis (`ANALYZE='true'`), generating the interactive treemap in `scratch/bundle_stats.html` via `rollup-plugin-visualizer` and feeding `npm run auditor:post-build`.
- **Mandatory Work Plan Compliance Mandate**: Whenever creating any work plan, technical proposal, or `implementation_plan.md`, agents MUST obligatorily invoke and enforce strict compliance with **`@/architecture`** (and its 6 design pillars + `/systematic-debugging`) alongside **`@/project-standards`**.
- **Objective-Driven Fuzzer Coverage & Deterministic History**: Fuzzer scenarios MUST prioritize legal actions exercising the mechanic under test. Fuzzer battle histories MUST record rich state metadata on disk (`fuzzer_certified_cases.json`) to enable deterministic 1:1 Playwright combat replays and fail fast on desync. Detailed history schema, timeout rules, and simulator invariants are governed strictly in [@/game-simulation](../game-simulation/SKILL.md).

---

## 🎮 Core Poké Vicio Architectural & Quality Mandates

### 1. Hybrid Retro-Modern Identity & GSAP Motion

- **Visual Design**: Blends modern UI shells (premium gradients, relief borders, shining accents) with a retro pixel art heart (sharp rendering, pixelated fonts and game sprites).
- **GSAP Exclusive Mandate**: All UI and battle animations MUST be implemented using GSAP. Manual CSS `@keyframes` or JS timers (`setTimeout`/`setInterval`) for animation flow are strictly forbidden.
- **Mandatory GSAP Migration over Deletion Mandate (Never Delete, Always Migrate)**: Whenever any auditor (`validate_component_styles.ts`, `npm run auditor:motion`, Fallow, or style linters) flags manual CSS transitions (`transition: ...`) or `@keyframes` violating the GSAP mandate, agents **MUST NEVER** simply delete or strip the animation rules to silence the warning, leaving UI elements static and lifeless. Agents **MUST ACTIVELY MIGRATE** the animation to GSAP (`v-gsap-hover`, `useGsapTransition`, `gsap.to()`, `gsap.from()`, `gsap.timeline()`, Vue `<Transition :css="false" @enter="..." @leave="...">`, or GSAP composables) preserving 1:1 visual motion, easing, duration, and user delight.
- **Zero-Timer Mandate & Exclusive GSAP Clock (`gsap.delayedCall`, `gsapSleep`)**: In `src/` (components, views, combat, and game flow), native timers (`setTimeout`, `setInterval`, `sleep`) are **STRICTLY FORBIDDEN** (audited with hard error by `manualTimersFrontend` and `zeroTimerBattleLogic`). All visual transitions, delays, and pacing MUST be orchestrated strictly and exclusively through **GSAP** (`gsap.delayedCall`, `gsapSleep`, `gsap.timeline()`). Any duration or delay passed to GSAP MUST use descriptive named constants in seconds with the `_SEC` suffix (e.g. `ANIMATION_DELAY_SEC`, `CATCH_SHAKE_DUR_SEC`), audited by `namedTimerConstants`. Native `setTimeout` is strictly restricted to non-visual background infrastructure (network fetch aborts, worker watchdogs) where it MUST use `_MS` constants.
- **SASS Integrity**: SASS function capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`). Write standard lowercase CSS filters/transforms.
- **GPU Efficiency & Performance**: Strict use of Texture Atlases, Object Pooling, layer promotion (`will-change: transform`), and filter chain optimizations (`pokemon-outline-performance`) to guarantee 60 FPS fluidity.
- **GBA Font Spanish Capitalization Constraint**: The primary pixel font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (replacing 'Ñ' with 'ñ') to avoid rendering artifacts.

### 2. Project-Specific Code Quality, Reactivity & Data Wrappers

> _Universal complexity, dead-code, magic-number, and duplication rules are governed by **`/architecture`** (`/clean-code`, `/auditor`, `/fallow`). In addition, Poké Vicio enforces:_

- **Fallow Minimum Health Score (`85/100`)**: A minimum project health score of **85/100** is mandatory (`fallow health --score`), with a 5 MB file size boundary (`--max-file-size 5`).
- **Mandatory Reactive Computed Purity Mandate**: Getters inside `computed(...)` across all stores and composables MUST be 100% mathematically pure without side effects. It is STRICTLY FORBIDDEN to mutate reactive state (`.value =`, `state.x =`, `this.x =`) or trigger persistence calls (`scheduleSave()`, `.save()`, `.persist()`) inside a computed getter. State mutations belong exclusively in Pinia actions or explicit watchers. Enforced with 0 errors by `validate_reactive_purity.ts`.
- **Mandatory Typed Domain Wrappers for JSON Files**: Directly importing raw `.json` files containing domain entities (items, species, moves, abilities, sets) is strictly forbidden. Every `.json` data file MUST be wrapped by a co-located TypeScript module exporting constants bounded by strict TypeScript domain union types (`ItemId`, `PokemonSpeciesId`, `AbilityId`, `PokemonMoveId`).

### 3. 4-Seat Battle Harness & 1v1 Active Combat Architecture

- **Mandatory 4-Seat Extensible Harness & 1v1 Active Battle Architecture**: Battle engine types, worker interfaces, state schemas, and harness adapters MUST be strictly designed and extensible to support up to 4 battle seats (`p1`–`p4`, 2vs2 double battles) when activated. The active gameplay battle orchestrator, UI HUDs, and heuristic AI execute the canonical 1v1 mode (`p1` vs `p2`), reserving `p3`/`p4` harness slots for multi-combatant expansion without duplicating core combat loops.

### 4. TypeScript & Domain Conventions (Poké Vicio Specifics)

- **Universal Domain Typing Delegation**: All TypeScript compile-time union rules, zero-any/zero-ignore policies, prohibition on type assertion bypasses, and $O(1)$ data structure patterns are governed by **`/architecture`** (via **`/domain-type-first`** and **`/auditor`**).
- **Poké Vicio TypeScript Conventions**: For game-specific rules—including `cloneReactive` for Vue 3 proxies, storage slot index preservation before `.filter()`, single canonical status sentinel (`''`), and justified escape hatch headers—consult [TypeScript & Data Integrity](./references/rules/typescript_conventions.md).

### 5. Event-Driven Simulation Sync & Zero-Timer Policy

- **Event-Driven Architecture Coordinated with GSAP Mandate**: Application logic, UI transitions, modal lifecycles, and component readiness MUST be 100% event-driven and strictly coordinated with GSAP animations. When visual elements enter, transition, or settle, their readiness for user or simulator interaction MUST be signaled through typed CustomEvents (`GAME_UI_EVENTS`) dispatched directly from GSAP timeline/tween `onComplete` callbacks or Vue reactive settling boundaries. Simulators must never guess when a UI element is interactive: they arm a listener beforehand and react cleanly to the event.
- **Battle Modal Exclusivity**: Before opening the battle arena/modal, the battle-entry flow MUST close every currently open modal that is not part of the battle flow. The close must complete before the arena opens, leaving the battle as the only active modal layer. This releases obsolete controls, prevents stale overlays from intercepting pointer input, and keeps all player and simulator interactions on the visible official UI.
- **Zero-Timer & Zero-Timeout-Inflation Mandate**: `setTimeout`, `setInterval`, numeric timers, or race timeouts are strictly forbidden in application and game logic. Timers are ONLY permitted in utility scripts (`node:timers/promises`) or in E2E tests as a maximum fail-safe cap (`MAX_PER_ACTION_TIMEOUT_MS = 10000`) to terminate stuck test runs. Inflating timeouts (e.g. to 20s or 35s) or adding arbitrary sleeps to "wait for the UI" is strictly prohibited: if an interaction fails within 10s, it is guaranteed to be an uncoordinated asynchronous state/animation defect that MUST be fixed by emitting and awaiting proper GSAP/UI events.
- **Public Event Contract for Simulators**: Playwright simulators must arm a listener before each visible UI action and resume only from a typed public application event emitted after the genuine domain/UI transition. Polling stores, FSM fields, DOM conditions, or private refs (`page.waitForFunction`, repeated locator-state checks, sleeps, or turn counters) is forbidden for synchronization. If a lifecycle has no suitable event, add one in `src/` at its real completion boundary; tests may observe it but never dispatch or forge it.
- **Passive UI Driver**: A simulator is never an alternate state machine. It may inspect read-only diagnostics for assertions, but it must not infer readiness from low-level state, force a transition, or compensate for a missed event. After an event, it uses only the visible official control that a player would use.

### 6. Poké Vicio 3-Tier Bug Fixing Specialization (Complementing `/systematic-debugging`)

> _The core RED-GREEN First Mandate (Gate 1 Inviolable), 4-Phase Reactive Lifecycle, Dual Consultation Gate, and Zero Hasty Patches/Fallbacks are governed strictly by **`/architecture`** $\rightarrow$ **`/systematic-debugging`**. In Poké Vicio, the 3-tier verification applies these game-specific requirements:_

- **Tier 1 (Isolated Unit Test - RED-to-GREEN)**: Extract and inline the failing Showdown fuzzer choice streams (`step.p1Choice`, `step.p2Choice`), `seed`, and history (or store them in a static fixture under `tests/fixtures/battle/`) in `tests/node/` or `tests/unit/` so regenerating the fuzzer never invalidates the test. For database/persistence bugs, execute across **ALL active database engines** (SQLite and PostgreSQL via `describeWithDatabase`).
- **Tier 2 (Integrity & Integration Test)**: Verify cross-module contracts, Valibot schema validations, battle FSM state transitions, Pinia store roundtrips, and `@pkmn/sim` parity in `tests/integration/` or `tests/node/` (asserting identical SQLite and PostgreSQL behavior for DB logic).
- **Tier 3 (Playwright E2E Simulation Following `@/game-simulation`)**: For bugs affecting UI, battle choreography, state synchronization, or player interaction, verify or implement Playwright E2E simulations governed strictly by [`@/game-simulation`](../game-simulation/SKILL.md):
  - _Passive Joystick Law_: React only to typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`) and explicit FSM readiness states.
  - _100% ID-Based & UID-Based Locators_: Locate UI elements strictly by `#<id>` or `data-pokemon-uid="${uid}"`, never by text matching or generic classes.
  - _Strict 10s Per-Action Timeout Limit_: `MAX_PER_ACTION_TIMEOUT_MS = 10000` once control is granted (`isReady = true`), never aborting while `isProcessing.value || isIntroAnimating.value`.
  - _Full Combat Log Retention_: Never truncate live `battleLogs` during combat; `clearLogs()` cleanses memory on battle completion.
  - _Zero Artificial Timers & Zero Retry-Loops_: No `sleep`, `page.waitForTimeout`, polling loops, or `clickResilient`.
  - _100% Shared Battle Runner & Certified Combat Replay_: Replay certified fuzzer cases through `ShowdownBattleRunner` with identical seeds, atomic history, and recorded choices.
  - _Dual-Driver Persistence Verification_: Execute persistence simulations in dual mode (`driver=dual`) verifying both SQLite and PostgreSQL engines cleanly, with fail-fast turn execution on any desync.

### 7. Database Isolation & Persistence Safety

> _General relational schema design, RLS best practices, and immutable forward-only SQL migration mechanics are coordinated via **`/architecture`** (`database-migrations` & `supabase-postgres-best-practices`). Poké Vicio additionally enforces:_

- **Context Isolation (DBRouter)**: Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via `DBRouter`. Run `npm run auditor:sql-migrations` before database commits.
- **Multi-Engine Behavioral Parity & Dual-Database Test Coverage Mandate**: SQLite (offline/in-memory) and PostgreSQL (online/Supabase) migrations, queries, constraints, error handling, and business functionality MUST behave 100% identically across both engines.
- **Zero-Pokemon Save Shield**: Saving game state (to IndexedDB, LocalStorage, OPFS, or Supabase) is strictly forbidden if the team and box contain 0 Pokémon OR if `starterChosen` is `false`. Abort save operations immediately if met.
- **Prohibition on Remote Database Updates**: AI agents MUST NEVER run or execute database update/migration scripts against remote, Docker-based, or shared database profiles (`server_franco`, `cloud`, `official_prod`). Remote updates are strictly reserved for manual execution by the user.
- **Simulator & Persistence Parity (Status Format)**: Status clearance/assignment across the entire application—including Showdown simulator, Pinia stores, and persistent saves—MUST use `''` (empty string) to denote no status (assigning `null` crashes the simulator and breaks serialization schemas). Status is strictly `PokemonStatusId | ''`, NEVER `null`.

### 8. Git Safety & Workflow Protection

- **Rollback Confirmation Protocol**: Before executing destructive Git operations (`git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly request user confirmation, disclosing the exact commands.
- **Protection of Uncommitted Files**: Before running bulk modification scripts on uncommitted files, create temporary backups inside `scratch/`.
- **Scratch Directory Mandate**: Temporary reports, text summaries, and debug outputs MUST be stored exclusively in `scratch/`.
- **Autonomous Commit & Main Branch Push Prohibition**: Commit flows MUST NOT be run autonomously without explicit user instructions. Pushing to `main` (`origin/main`) is strictly forbidden for agents. Explicitly requested pushes to non-main development/feature branches (such as `desarrollo`) are permitted.

### 9. Asset Pipeline, Crafting Tiers & CLI Execution Safety

- **Mandatory Centralized Asset Management Mandate (`getAssetUrl`)**: All visual assets across the entire project (sprites, trainers, items, maps, banners, badges, battle backgrounds, UI icons, ranked medals) MUST be resolved strictly and exclusively through the centralized asset service (`getAssetUrl(ASSET_TYPES.<CATEGORY>, id, options)`) from `@/logic/services/assetService`. Directly hardcoding asset path strings (`/assets/...`, `/sprites/...`, or relative asset paths) in Vue component templates, styles, Pinia stores, or static configuration files (`src/data/`) is STRICTLY FORBIDDEN. Static databases must only store canonical domain IDs; path resolution is strictly the responsibility of `assetService`. Detailed asset pipeline commands and sprite organization are governed in [Asset Service Manual](./references/technical/asset_service_manual.md).
- **Mandatory Crafting Tier Hierarchy**: All inventory and shop item sprites in `public/assets/sprites/` MUST follow the 4-tier domain hierarchy (`crafting/tier0/`, `crafting/tier1/`, `crafting/tier2/`, `crafting/tier3/`) mapped from `item.craftingTier`. Detailed asset pipeline commands and sprite organization are governed in [Asset Service Manual](./references/technical/asset_service_manual.md).
- **Mandatory Artwork Standards (Species Whitelist, Spanish Typography & Zero Hardcoded Dates)**: Any artwork, event banners, tournament illustrations, or promotional graphics generated or registered for the game MUST strictly adhere to three unified mandates:
  1. **Strict Species Whitelist**: Strictly and exclusively depict Pokémon from the enabled species whitelist (`ENABLED_POKEMON_IDS` in `src/data/system/constants.ts`). Non-whitelisted or unapproved species (Lucario, Garchomp, Greninja, Metagross, Tyranitar, Darkrai, Blaziken, or custom forms like Mewtwo Armored) are strictly forbidden in illustration prompts and reward tables.
  2. **Mandatory Spanish Typography**: If an illustration or banner contains any typography, titles, logos, slogans, or stadium signage, it MUST be strictly and exclusively in Spanish (e.g. `"TORNEO FRONTERA JOHTO-KANTO"`). English text burned into illustration pixels is strictly forbidden.
  3. **Zero Hardcoded Dates**: Images MUST NEVER contain burned-in calendar dates, years (e.g. 2024, 2026), timeslots, or fixed hours. All event timing is dynamic and managed via Vue UI overlays. Detailed event system standards are governed in [Event System Manual](./references/systems/event_system_manual.md).
- **Absolute Prohibition on Manual Command PATH Injections (`noManualPathInjection`)**:
  - AI agents are STRICTLY FORBIDDEN from prefixing CLI commands with ad-hoc path variables (e.g. `$env:Path = ...; npm ...`, `export PATH=... && npm ...`, or inline path wrappers).
  - All commands MUST be executed cleanly and natively (`npm run <script>`, `vp <tool>`, `node <file>`).
  - If a required binary (`node`, `npm`, `vp`) is not resolved in PATH, the agent MUST instruct the user to run the root setup script and restart their IDE/terminal, NEVER pollute commands with manual PATH injections.
- **Hardware-Adaptive Worker Concurrency Mandate**:
  - Multi-process worker pools (master audit runner, safe-commit gatekeeper, asset compression, fuzzer engines) MUST calculate worker capacity dynamically based on available logical cores divided by the standard coefficient: `Math.max(1, Math.floor(availableCpus / 2))` for CPU-heavy auditor tasks, and `Math.floor(os.cpus().length / 4)` for multi-threaded fuzzer/browser testing. Hardcoding arbitrary static limits (such as a fixed cap of 6) is strictly prohibited.

---

## 🧭 Navigation Hub, Documentation Taxonomy & Anti-Junk-Drawer Policy

### 📚 7-Tier Documentation Taxonomy

To prevent clutter, confusion, and document degradation, documentation in `references/` is strictly divided into 7 distinct tiers:

1. **`references/rules/` (Developer & Engine Governance ONLY)**: Invariable architectural laws, coding constraints, and low-level engine integration rules (Showdown worker interface, 4-seat generalization, zero-timers, Zero-Any TypeScript, Git safety, Save Shield). 🛑 **NEVER put gameplay feature rules, drop tables, or daycare/egg mechanics here.**
2. **`references/systems/` (Gameplay Systems & Features SSoT)**: The dedicated Single Source of Truth for specific in-game features (`breeding_manual.md` for Daycare/Eggs/Vigor, `gym_system_manual.md` for Gyms, `obedience_mechanics_manual.md` for Obedience/Level Caps, `item_system_manual.md` for Items/Crafting, `capturing_manual.md` for Capture Math, `evolution_manual.md` for Evolutions, `ev_mechanics_manual.md` for EVs, `war_system_manual.md` for Faction War, `spawn_grid_manual.md` for Spawns).
3. **`references/battle/` (Combat Arena & Battle Execution)**: Battle state transitions, Showdown event translation, GSAP combat animations, combat camera, status ailments, and weather standards.
4. **`references/core/` (Mathematical Formulas & UI/UX Standards)**: Central mathematical formulas (Damage, Catch rates, Stats, Escape, Minigames) and global UI/UX design tokens.
5. **`references/technical/` (Infrastructure & Frontend Tech)**: GPU optimization, SASS styling, asset pipelines, DBRouter proxy architecture, SQL dialect translation, legacy migration, and Supabase infrastructure.
6. **`references/qa/` (QA Protocols, Audit Checklists & Animation Testing)**: Manual and automated testing protocols, DevTools shortcuts, verification matrix (`browser_testing_manual.md`), animation and forced-switch checklists (`manual_testing_battle_animations.md`), pre-release audit checklists (`audit_checklist.md`), and quality verification standards (`validation_manual.md`).
7. **`references/content/` (Content Creation & Quest Crafting)**: Quest authoring, content design, event storyline crafting, and dialog trees (`content_creation_manual.md`).

### 🌳 Document Routing Decision Tree

Before writing or updating any rule, manual, or architectural lesson, consult this decision tree to prevent documentation duplication:

| If your improvement/rule relates to...                                                    | Canonical Document (SSoT)                                                                                      | DO NOT duplicate in...                        |
| :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| **Compiler rules, TypeScript unions, type casting, JSON wrappers, security**              | [typescript_conventions.md](./references/rules/typescript_conventions.md)                                      | `rules/game_engine_and_state.md`              |
| **E2E Playwright tests, fuzzer history, #id locators, test timeouts**                     | [game-simulation](../game-simulation/SKILL.md)                                                                 | `qa/browser_testing_manual.md`                |
| **Unit & integration test architecture, taxonomy, anti-fragmentation, zero-fake-mock**    | [testing_and_simulations.md](./references/rules/testing_and_simulations.md)                                    | `rules/game_engine_and_state.md`              |
| **DBRouter isolation, Save Shield, SQL migrations, DB permissions**                       | [database_and_persistence.md](./references/rules/database_and_persistence.md)                                  | `technical/save_system_manual.md`             |
| **Git operations, scratch files, destructive rollbacks, root setup scripts**              | [git_and_workflow_safety.md](./references/rules/git_and_workflow_safety.md)                                    | `SKILL.md`                                    |
| **Showdown engine delegation, 4 seats, UID team sync, illegal Pokemon lifecycle**         | [game_engine_and_state.md](./references/rules/game_engine_and_state.md)                                        | `battle/battle_mechanics_manual.md`           |
| **Daycare, Breeding, Hatching, Egg capacity limits, Baby rewards, Vigor**                 | [breeding_manual.md](./references/systems/breeding_manual.md)                                                  | `rules/game_engine_and_state.md`              |
| **Obedience level caps, Met Level checks, disobedience RNG rolls, anti-cheat flags**      | [obedience_mechanics_manual.md](./references/systems/obedience_mechanics_manual.md)                            | `systems/friendship_mechanics_manual.md`      |
| **Battle engine logic, Showdown worker sync, choice loops, recharge states**              | [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md)                                   | `rules/game_engine_and_state.md`              |
| **Opponent AI presets, 5-tier archetype difficulty, anti-switch-loop rules**              | [battle_ai_standards.md](./references/battle/battle_ai_standards.md)                                           | `battle/battle_mechanics_manual.md`           |
| **Major & volatile status conditions, triggers, recovery, immunities**                    | [status_ailments_manual.md](./references/battle/status_ailments_manual.md)                                     | `battle/battle_mechanics_manual.md`           |
| **Mathematical formulas (Damage, Stats, EXP, Minigames, Stage multipliers)**              | [game_formulas_manual.md](./references/core/game_formulas_manual.md)                                           | `battle/battle_mechanics_manual.md`           |
| **Combat animations, GSAP timelines, sprite FX, Void Protocol, feetCache**                | [animation_standards.md](./references/battle/animation_standards.md)                                           | `technical/sass_styling_manual.md`            |
| **Active battle F5 reload, save serialization, anti-cheat minigames**                     | [battle_persistence_and_anti_cheat_manual.md](./references/battle/battle_persistence_and_anti_cheat_manual.md) | `rules/database_and_persistence.md`           |
| **Showdown protocol event translation to Spanish logs (`showdownBridge`)**                | [bridge_guide.md](./references/battle/bridge_guide.md)                                                         | `battle/battle_mechanics_manual.md`           |
| **Database schemas, SQLite WASM, query proxies, Supabase RPCs**                           | [dbrouter_manual.md](./references/technical/dbrouter_manual.md)                                                | `rules/database_and_persistence.md`           |
| **PostgreSQL to SQLite migration translation, 10-step table recreation**                  | [db_translation_manual.md](./references/technical/db_translation_manual.md)                                    | `rules/database_and_persistence.md`           |
| **Legacy code modernization protocol to Vue 3 Composition API & GSAP**                    | [legacy_migration_manual.md](./references/technical/legacy_migration_manual.md)                                | `core/ui_ux_standards.md`                     |
| **Save data schema, Valibot parsing, encryption, account storage**                        | [save_system_manual.md](./references/technical/save_system_manual.md)                                          | `rules/database_and_persistence.md`           |
| **SASS mixins, CSS variables, GBA font rules, visual styling**                            | [sass_styling_manual.md](./references/technical/sass_styling_manual.md)                                        | `core/ui_ux_standards.md`                     |
| **Step-by-step QA testing protocols, DevTools shortcuts, verification matrix**            | [browser_testing_manual.md](./references/qa/browser_testing_manual.md)                                         | `rules/testing_and_simulations.md`            |
| **Manual QA verification of battle animations, forced switches, flee & teleport, catch**  | [manual_testing_battle_animations.md](./references/qa/manual_testing_battle_animations.md)                     | `qa/browser_testing_manual.md`                |
| **Pre-release audit checklists, gate verifications, release protocols**                   | [audit_checklist.md](./references/qa/audit_checklist.md)                                                       | `qa/validation_manual.md`                     |
| **Content design, event authoring, quest crafting, and dialog trees**                     | [content_creation_manual.md](./references/content/content_creation_manual.md)                                  | `core/ui_ux_standards.md`                     |
| **World events, tournaments, event banners, artwork whitelist, seasonal rewards**         | [event_system_manual.md](./references/systems/event_system_manual.md)                                          | `rules/game_engine_and_state.md`              |
| **Low power mode, battery savings, mobile rendering throttling**                          | [low_power_mode_manual.md](./references/technical/low_power_mode_manual.md)                                    | `technical/gpu_optimization_manual.md`        |
| **Specific gameplay systems (Daycare, Gyms, Items, War, Trade, Spawn Grid, EV, Capture)** | [systems/*_manual.md](./references/systems/)                                                                   | `core/ui_ux_standards.md`                     |
| **Generation-specific capturing mechanics (Gen I through Gen IX)**                        | [capturing_manual.md](./references/systems/capturing_manual.md)                                                | `core/game_formulas_manual.md`                |
| **High-level game mechanics architecture, GameBus, DND sorting, Void Protocol**           | [game_mechanics_manual.md](./references/core/game_mechanics_manual.md)                                         | `rules/game_engine_and_state.md`              |
| **Network loopback, Hairpin NAT, MikroTik multi-WAN load balancing**                      | [network_infrastructure_manual.md](./references/technical/network_infrastructure_manual.md)                    | `technical/supabase_infrastructure_manual.md` |

---

### 📜 Master References Index

#### 1. Specialized Agent Rule Modules (`references/rules/`)

- [All Rules Index](./references/rules/README.md)
- [TypeScript & Data Integrity](./references/rules/typescript_conventions.md)
- [Testing & Simulations](./references/rules/testing_and_simulations.md)
- [Database & Persistence](./references/rules/database_and_persistence.md)
- [Git & Workflow Safety](./references/rules/git_and_workflow_safety.md)
- [Game Engine & State](./references/rules/game_engine_and_state.md)

#### 2. Technical, Infrastructure & QA Manuals (`references/technical/`, `qa/`, `content/`)

- **@/architecture** & **@/domain-type-first** (bundled in `@francogp/auditor`)
- [Browser Testing Manual](./references/qa/browser_testing_manual.md)
- [Battle Animations QA Manual](./references/qa/manual_testing_battle_animations.md)
- [Validation & Quality Manual](./references/qa/validation_manual.md)
- [Audit & Pre-Release Checklist](./references/qa/audit_checklist.md)
- [Save System Manual](./references/technical/save_system_manual.md)
- [DBRouter Manual](./references/technical/dbrouter_manual.md)
- [Database Dialect Translation](./references/technical/db_translation_manual.md)
- [Legacy Migration Manual](./references/technical/legacy_migration_manual.md)
- [Asset Service Manual](./references/technical/asset_service_manual.md)
- [Animated Sprites Manual](./references/technical/animated_sprites_manual.md)
- [GPU Optimization Manual](./references/technical/gpu_optimization_manual.md)
- [Low Power Mode Manual](./references/technical/low_power_mode_manual.md)
- [SASS Styling Manual](./references/technical/sass_styling_manual.md)
- [Dependency Management](./references/technical/dependency_management_manual.md)
- [Supabase Infrastructure](./references/technical/supabase_infrastructure_manual.md)
- [Network Infrastructure & Routing](./references/technical/network_infrastructure_manual.md)
- [Markdown Standards](./references/technical/markdown_standards.md)
- [Content Creation Manual](./references/content/content_creation_manual.md)

#### 3. Battle, Core & Gameplay Systems Manuals (`references/battle/`, `core/`, `systems/`)

- [Battle Mechanics Manual](./references/battle/battle_mechanics_manual.md)
- [Battle AI & Heuristic Standards](./references/battle/battle_ai_standards.md)
- [Battle Persistence & Anti-Cheat Manual](./references/battle/battle_persistence_and_anti_cheat_manual.md)
- [Showdown Bridge Guide](./references/battle/bridge_guide.md)
- [Showdown Canonical Source Code](../../../external/pokemon-showdown-code/)
- [Animation Standards](./references/battle/animation_standards.md)
- [Combat Camera Manual](./references/battle/combat_camera_manual.md)
- [Weather Mechanics Standards](./references/battle/weather_mechanics_standards.md)
- [Status Ailments Manual](./references/battle/status_ailments_manual.md)
- [Game Formulas Manual (Math SSoT)](./references/core/game_formulas_manual.md)
- [Game Mechanics & Architecture Manual](./references/core/game_mechanics_manual.md)
- [Time System Manual](./references/core/time_system_manual.md)
- [UI/UX Standards](./references/core/ui_ux_standards.md)
- [Friendship & Happiness Mechanics](./references/systems/friendship_mechanics_manual.md)
- [Obedience & Level Cap Mechanics](./references/systems/obedience_mechanics_manual.md)
- [EV Mechanics Manual](./references/systems/ev_mechanics_manual.md)
- [Evolution Manual](./references/systems/evolution_manual.md)
- [Breeding Manual](./references/systems/breeding_manual.md)
- [Encounter Manual](./references/systems/encounter_manual.md)
- [Capturing Mechanics Manual](./references/systems/capturing_manual.md)
- [Gym System Manual](./references/systems/gym_system_manual.md)
- [Item System Manual](./references/systems/item_system_manual.md)
- [Spawn Grid Manual](./references/systems/spawn_grid_manual.md)
- [Trade & Social Manual](./references/systems/trade_social_manual.md)
- [Faction War Manual](./references/systems/war_system_manual.md)
- [Mystery Dungeon Equipment](./references/systems/mystery_dungeon_equipment_standards.md)
- [Event System Manual](./references/systems/event_system_manual.md)

---

## 🛠️ Aesthetic & Quality Audit Checklist

Before declaring any task completed, verify code against this mandatory checklist:

- [ ] **Architectural Reuse**: Have I extracted and reused existing components/base classes without duplicating logic?
- [ ] **GPU Acceleration**: Have I applied layer promotion (`will-change: transform`) and object pooling on animated/heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated, sharp, and properly rendered with appropriate font fallbacks ('ñ' handled)?
- [ ] **CLI-First State Verification**: Have I verified game states via `window.__VITE_DEBUG__` console commands?
- [ ] **Proportional Verification**: For documentation/skill edits, does `npm run auditor:md` pass cleanly? For code development, does `npm run auditor` pass with 0 errors and zero regressions against `.auditor/audit-baseline.json`?
- [ ] **Fallow Score Compliance**: Does `npm run fallow:health` report a score of 85 or higher?
- [ ] **Language Parity**: Are code files (.ts, .vue) and skill files written in English, documentation in the file's native language (English or Spanish), with zero intra-file language mixing?
