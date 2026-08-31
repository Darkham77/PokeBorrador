---
name: project-standards
description: Core governance, workspace environment setup, and architectural standards for Poké Vicio. Governs Hybrid Retro-Modern identity, 500/1000-line SRP modularity, Zero-Ignore TypeScript, DBRouter persistence isolation, zero-timers, and E2E simulation rules. Single source of truth for executing all-in-one workspace setup scripts (setup-windows.ps1 / setup-linux.sh) and navigation hub for specialized rule manuals. Load whenever updating or preparing the working environment/dependencies, starting new tasks, modifying core engine/stores/components, refactoring, writing tests, or reviewing project standards.
---

# Project Standards (Core Governance & Navigation Hub)

This skill defines the immutable core DNA and architectural standards of Poké Vicio. It provides comprehensive governance for design, code quality, security, testing, persistence, and workflow safety, as well as explicit instructions on how and when to consult specialized reference manuals.

- **All-in-One Environment Setup & Workspace Update Mandate**: Whenever instructed to initialize, configure, or update the workspace/environment (e.g. *"actualiza el entorno de trabajo"*, *"actualizar entorno"*, *"preparar el entorno"*, *"setup environment"*), the single-command source of truth is the root setup script:
  - **Windows (PowerShell as Admin / Terminal)**: `PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1`
  - **Linux / macOS (Terminal)**: `chmod +x ./setup-linux.sh && ./setup-linux.sh`
  This script automatically prompts and elevates Administrator permissions via the native Windows UAC modal dialog (`setup-windows.ps1`) or sudo when required, installs/configures NVM, dynamically queries nodejs.org for the latest stable Current Node.js release, updates `package.json` engines and `.nvmrc` automatically, installs and activates the Node runtime, updates npm globally (`npm install -g npm@latest`), enforces global npm security policies (`ignore-scripts true`, HTTPS registry, high audit level), cleans residual cache, and runs `npm ci` for a deterministic, ready-to-code workspace in a single run.
  - **IDE & Terminal Restart Recommendation**: Whenever setup scripts modify system/user environment variables, NVM symlinks, or PATH, the agent MUST explicitly advise the user to restart their IDE (or reload terminal windows) so that all child process trees inherit the updated system PATH, eliminating the need for manual PATH injections in subsequent tool executions.
- **Zero Audit Failures Mandate**: Under NO circumstances are audit failures allowed in any Git commit or pull request. The primary quality gatekeeper is `npm run audit` (which must report exactly 0 errors). The command `npm run audit:warnings-diff` is STRICTLY RESERVED for the safe-commit pipeline to compare new warnings vs `origin/main`; running it for general development, documentation, or outside safe-commit is strictly forbidden.
- **Universal Quality & Audit Ecosystem**: All repository audits are organized under `scripts/auditors/` across 6 domain families (`architecture`, `domain_data`, `persistence`, `fsm`, `assets`, `documentation`). The single master audit runner `npm run audit` executes 100% of sub-auditors dynamically with zero omissions, displaying formatted step-by-step progress lines and a consolidated Box-Drawing summary table in the terminal while writing the complete structured JSON report with all findings to `scratch/audits/latest_audit.json` (and `scratch/audits/<family>/<id>.json` for individual suites). AI agents needing line-level details must read `scratch/audits/latest_audit.json` directly from disk.
- **Strict No-Test Mandate for Documentation**: Running test suites (`npm run test`, `test:node`, Vitest, or E2E Playwright simulations) when only editing `.md` documents, DOX indices, or `.agents/` skill files is STRICTLY FORBIDDEN. Verification for documentation tasks is strictly limited to `npm run audit:dox` and `npm run lint:md` (or fast `npm run lint`).
- **Mandatory DOX Navigation**: You MUST always use the `dox-navigator` skill (or trigger the `/dox-navigator` command) to analyze the project context, search for files, components, and manuals, and update any index or documentation within the project.
- **Objective-Driven Fuzzer Coverage & Deterministic History**: Fuzzer scenarios MUST prioritize legal actions exercising the mechanic under test. Fuzzer battle histories MUST record rich state metadata on disk (`fuzzer_certified_cases.json`) to enable deterministic 1:1 Playwright combat replays and fail fast on desync. Detailed history schema and simulator rules are governed in [Testing & Simulations](./references/rules/testing_and_simulations.md).

---

## 🏛️ Core Architectural & Quality Mandates

### 1. Hybrid Retro-Modern Identity
- **Visual Design**: Blends modern UI shells (premium gradients, relief borders, shining accents) with a retro pixel art heart (sharp rendering, pixelated fonts and game sprites).
- **GSAP Exclusive Mandate**: All UI and battle animations MUST be implemented using GSAP. Manual CSS `@keyframes` or JS timers (`setTimeout`/`setInterval`) for animation flow are strictly forbidden.
- **Mandatory GSAP Migration over Deletion Mandate (Never Delete, Always Migrate)**: Whenever any auditor (`validate_component_styles.ts`, `audit_project.ts`, Fallow, or style linters) flags manual CSS transitions (`transition: ...`) or `@keyframes` violating the GSAP mandate, agents **MUST NEVER** simply delete or strip the animation rules to silence the warning, leaving UI elements static and lifeless. Agents **MUST ACTIVELY MIGRATE** the animation to GSAP (`v-gsap-hover`, `useGsapTransition`, `gsap.to()`, `gsap.from()`, `gsap.timeline()`, Vue `<Transition :css="false" @enter="..." @leave="...">`, or GSAP composables) preserving 1:1 visual motion, easing, duration, and user delight. Auditor warnings highlight non-compliant *technology choices* (e.g. CSS keyframes), NEVER an instruction to remove the visual feature itself. The mandatory goal of audit remediation is architectural evolution with 100% visual parity.
- **SASS Integrity**: SASS function capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`). Write standard lowercase CSS filters/transforms.
- **GPU Efficiency & Performance**: Strict use of Texture Atlases, Object Pooling, layer promotion (`will-change: transform`), and filter chain optimizations (`pokemon-outline-performance`) to guarantee 60 FPS fluidity.
- **GBA Font Spanish Capitalization Constraint**: The primary pixel font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (replacing 'Ñ' with 'ñ') to avoid rendering artifacts.

### 2. Code Modularity & Quality (500/1000-Line Limit)
- **Modularity Limits**: Files exceeding **500 lines** trigger modularization recommendations. No logic or UI component file may exceed **1000 lines** (hard limit; static databases and metadata in `src/data/` are exempt).
- **Proactive Dead Code & Legacy File Elimination**: Whenever dead code analysis or auditors report orphan or unused files, agents MUST investigate each case individually. If confirmed to be obsolete legacy code or superseded prototypes, delete the files and remove dead exports completely from the codebase instead of retaining dead weight or applying broad ignore filters.
- **Absolute Prohibition on Magic Numbers & Value-Hardcoding**: Inline numeric literals directly inside business logic, UI components, workers, or tests are strictly forbidden. All numbers MUST be declared as descriptive `readonly` named constants or `as const` config objects. Shared constants used in multiple files MUST be exported from a central constants module. Constant identifiers MUST NOT include their numeric values (e.g. `ARCHAEOLOGY_CAVE_BASE_WEIGHT` is required, `ARCHAEOLOGY_CAVE_BASE_WEIGHT_10` is strictly forbidden). String literals with values/fractions/regex helpers (`"random(-10, 10)"`) MUST use `// no-magic`.
- **Suppression Comment Protocol (`// magic-ok`, `// no-magic`, `// number-ok`)**: These inline suppression tokens are escape hatches for genuinely un-nameable values (formula coefficients, template text, GSAP string math), NOT shortcuts to avoid declaring constants. Detailed allowed/forbidden cases are cataloged in [TypeScript Conventions](./references/rules/typescript_conventions.md).
- **Mandatory Typed Domain Wrappers for JSON Files**: Directly importing raw `.json` files containing domain entities (items, species, moves, abilities, sets) is strictly forbidden. Every `.json` data file MUST be wrapped by a co-located TypeScript module exporting constants bounded by strict TypeScript domain union types (`ItemId`, `PokemonSpeciesId`, `AbilityId`, `PokemonMoveId`).

### 3. Architectural Reuse, Polymorphism & 4-Seat Compatibility
- **Zero-Duplication & Inheritance Mandate**: Duplicating logic, structures, components, or control flows anywhere in the codebase is strictly forbidden. Refactor to extract common base classes, parameterized composables, or generic extensible components before writing new code.
- **Mandatory 4-Seat Generic Compatibility**: Every battle orchestration, state synchronization, worker payload processing, and UI component MUST be strictly designed and generalized to support up to 4 battle seats (`p1`, `p2`, `p3`, `p4`) dynamically. Hardcoding logic for only 2 seats is strictly prohibited.

### 4. TypeScript Integrity & Zero-Ignore Policy
- **Zero-Ignore & Zero-Any**: `@ts-ignore`, `@ts-nocheck`, and `any` are strictly forbidden across the entire repository (including Web Workers and E2E simulation files).
- **Mandatory Domain-Type-First Governance**: Every data type, domain constant, schema, DTO, or boundary contract MUST follow `@/domain-type-first`. Naked `string` declarations for finite domains, open index signatures (`[key: string]: unknown`), wildcard unions (`| string`), open sets/maps (`new Set<string>()`/`new Map()`), and inline type casts (`as Type`, `as any`) are strictly forbidden.
- **Absolute Prohibition on `Set`/`Map` for Domain Types**: `new Set<string>()` and `new Map()` are mutable runtime data structures, NOT type definitions. Finite domains MUST use `as const` arrays + `(typeof ARRAY)[number]` for typing, and `(ARRAY as readonly string[]).includes(val)` for runtime validation.
- **Prohibition on Type Assertion Bypasses**: Type assertions (`as Type`, `as unknown as T`) or helper functions created solely to wrap double casts to evade type checking are strictly prohibited. All data boundaries MUST use explicit boundary adapter functions.
- **O(1) Data Structures Priority Mandate**: Prioritize $O(1)$ constant-time data structures (`Record<DomainId, T>`, `ReadonlySet<DomainId>`, `computed<Map<DomainId, ...>>`) over linear $O(N)$ searches across all static catalogs (`src/data/`), Pinia stores (`src/stores/`), and battle engine logic (`src/logic/`). Zero-allocation pure helpers MUST replace deep JSON serialization in hot simulation paths.

### 5. Event-Driven Simulation Sync & Zero-Timer Policy
- **Event-Driven Architecture**: Application logic, state transitions, save loading, and component orchestration MUST be 100% event-driven (using promises, GSAP timelines, custom events, or store state changes).
- **Battle Modal Exclusivity**: Before opening the battle arena/modal, the battle-entry flow MUST close every currently open modal that is not part of the battle flow. The close must complete before the arena opens, leaving the battle as the only active modal layer. This releases obsolete controls, prevents stale overlays from intercepting pointer input, and keeps all player and simulator interactions on the visible official UI.
- **Zero-Timer Mandate**: `setTimeout`, `setInterval`, numeric timers, or race timeouts are strictly forbidden in application and game logic. Timers are ONLY permitted in utility scripts (`node:timers/promises`) or in E2E tests as a maximum fail-safe cap to terminate stuck test runs.
- **Public Event Contract for Simulators**: Playwright simulators must arm a listener before each visible UI action and resume only from a typed public application event emitted after the genuine domain/UI transition. Polling stores, FSM fields, DOM conditions, or private refs (`page.waitForFunction`, repeated locator-state checks, sleeps, or turn counters) is forbidden for synchronization. If a lifecycle has no suitable event, add one in `src/` at its real completion boundary; tests may observe it but never dispatch or forge it.
- **Passive UI Driver**: A simulator is never an alternate state machine. It may inspect read-only diagnostics for assertions, but it must not infer readiness from low-level state, force a transition, or compensate for a missed event. After an event, it uses only the visible official control that a player would use.

### 6. Zero-Tolerance Turn Failure, 3-Tier Bug Fixing Protocol & Anti-Hasty-Patch Mandate
- **Mandatory 3-Tier Bug Fixing Protocol**: Whenever ANY bug, failure, or behavioral inconsistency occurs across the repository, the agent MUST apply the full 3-tier protocol:
  - **Tier 1 (Isolated Unit Test - RED-to-GREEN)**: The agent **MUST FIRST** create an isolated, self-contained unit test in `tests/node/` (or `tests/unit/`) reproducing the exact failure deterministically in **RED** before touching `src/`. The test MUST **extract and inline the failing case data** (or store it in a static fixture file under `tests/fixtures/battle/`) so regenerating the fuzzer or external databases never breaks the unit test. The extracted turn-by-turn choice streams (`step.p1Choice`, `step.p2Choice`), `seed`, and history MUST be executed sequentially to reproduce in RED, and verify empirical repair in GREEN once `src/` is fixed.
  - **Tier 2 (Integrity & Integration Test)**: Create or update an integration/integrity test in `tests/integration/` or `tests/node/` verifying cross-module contracts, schema validations, FSM state transitions, store roundtrips, and `@pkmn/sim` parity to ensure that changes do not create boundary desynchronizations.
  - **Tier 3 (Playwright E2E Simulation Following `@/game-simulation`)**: For any bug affecting UI, battle choreography, state synchronization, or player interaction, verify or implement Playwright E2E simulations governed strictly by the immutable laws in `@/game-simulation` (`.agents/skills/game-simulation/SKILL.md`):
    - *Passive Joystick Law*: Tests act purely as passive joysticks reacting only to typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`) and explicit FSM readiness states.
    - *100% ID-Based & UID-Based Locators*: UI elements MUST be located strictly by `#<id>` or `data-pokemon-uid="${uid}"`, never by text matching or generic classes.
    - *Strict 5s Per-Action Timeout Limit*: `MAX_PER_ACTION_TIMEOUT_MS = 5000`. A timeout is never a time shortage; it indicates a structural bug in `src/`. Never inflate action timeouts.
    - *Zero Artificial Timers & Zero Retry-Loops*: Arbitrary delays (`sleep`, `page.waitForTimeout`), polling loops, or retry wrappers (`clickResilient`) are strictly forbidden.
    - *100% Shared Battle Runner & Certified Combat Replay*: Browser combats replay certified fuzzer cases through `ShowdownBattleRunner`, consuming identical seeds, atomic history, native choices, and recorded actions.
- **Fail-Fast Turn Execution**: In Playwright E2E simulations, a single turn failure, unhandled rejection, or desync MUST immediately abort execution with a descriptive error. Retries, silent skips, and spin-loops are strictly forbidden.
- **Prohibition on Hasty Patches & Fallbacks**: Inventing hasty fallbacks (e.g. returning `'default'`, fallback moves, or mock objects) or swallowing errors (`.catch(() => true)`) to force tests or simulations to pass is strictly forbidden. Root causes MUST be diagnosed and fixed in `src/`.

### 7. Database Isolation & Persistence Safety
- **Context Isolation (DBRouter)**: Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via `DBRouter`. Run `npm run validate:sql` before database commits.
- **Zero-Pokemon Save Shield**: Saving game state (to IndexedDB, LocalStorage, OPFS, or Supabase) is strictly forbidden if the team and box contain 0 Pokémon OR if `starterChosen` is `false`. Abort save operations immediately if met.
- **Prohibition on Remote Database Updates**: AI agents MUST NEVER run or execute database update/migration scripts against remote, Docker-based, or shared database profiles (`server_franco`, `cloud`, `official_prod`). Remote updates are strictly reserved for manual execution by the user.
- **Simulator Parity & Status Format**: Showdown simulator status clearance/assignment MUST use `''` (empty string) to denote no status (assigning `null` crashes the simulator). Client-side Vue store Pokémon representations may use `null`.

### 8. Git Safety, Workflow & Security
- **Rollback Confirmation Protocol**: Before executing destructive Git operations (`git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly request user confirmation, disclosing the exact commands.
- **Protection of Uncommitted Files**: Before running bulk modification scripts on uncommitted files, create temporary backups inside `scratch/`.
- **Scratch Directory Mandate**: Temporary reports, text summaries, and debug outputs MUST be stored exclusively in `scratch/`.
- **Autonomous Commit & Main Branch Push Prohibition**: Commit flows MUST NOT be run autonomously without explicit user instructions. Pushing to `main` (`origin/main`) is strictly forbidden for agents. Explicitly requested pushes to non-main development/feature branches (such as `desarrollo`) are permitted.
- **Strict Zero-Hiding Security Mandate**: Suppressing or hiding security vulnerabilities (CWE path traversals, SSRF risks) using ignore files (`.fallowrc.json`), inline comments (`// fallow-ignore`), or exclusions is strictly forbidden. Every security finding MUST be resolved at its source via path sanitization and boundary checks.

### 9. Asset Pipeline, Crafting Tiers & CLI Safety Mandate
- **Mandatory Crafting Tier Hierarchy**: All inventory and shop item sprites in `public/assets/sprites/` MUST follow the 4-tier domain hierarchy (`crafting/tier0/`, `crafting/tier1/`, `crafting/tier2/`, `crafting/tier3/`) mapped from `item.craftingTier`. Detailed asset pipeline commands and sprite organization are governed in [Asset Service Manual](./references/technical/asset_service_manual.md).
- **Canonical Asset Pipeline Execution**: New sprites MUST be saved into `_raw-assets/public/assets/sprites/` under their canonical tier folder, and converted via `npm run assets:convert`. Ad-hoc conversions bypassing `_raw-assets/` are strictly forbidden.
- **Prohibition of Multi-Line Inline Node CLI Commands (`noInteractiveCliHangs`)**:
  - AI agents MUST NEVER run multi-line inline scripts (`npx tsx -e "..."` or `node -e "..."`) in terminal background tasks on Windows. Doing so causes child processes to hang or await interactive stdin indefinitely.
  - All validations, diagnostic checks, and tests MUST be executed via dedicated Vitest test files (`npx vitest run <path>`) or dedicated script files in `scripts/` or `scratch/`.
- **Absolute Prohibition on Manual Command PATH Injections (`noManualPathInjection`)**:
  - AI agents are STRICTLY FORBIDDEN from prefixing CLI commands with ad-hoc path variables (e.g. `$env:Path = ...; npm ...`, `export PATH=... && npm ...`, or inline path wrappers).
  - All commands MUST be executed cleanly and natively (`npm run <script>`, `npx <tool>`, `node <file>`).
  - If a required binary (`node`, `npm`, `npx`) is not resolved in PATH, the agent MUST instruct the user to run the root setup script and restart their IDE/terminal, NEVER pollute commands with manual PATH injections.
- **Fast Development Lint Pipeline (`npm run lint`)**:
  - `npm run lint` MUST execute all 4 checks: `validate:domain-types`, `validate:types` (`vue-tsc --noEmit`), `eslint --cache`, and `lint:md`.
  - Markdownlint MUST strictly ignore `external/**` and `.git/**` to prevent scanning external source trees.
- **Proportional Verification Protocol (Fast Lint vs Full Audit)**:
  - **Documentation & Skills (`.md`)**: Run ONLY `npm run lint:md` (~1-2s). Running heavy audits for documentation or skill edits is strictly forbidden.
  - **In-Development Code Iteration**: Run `npm run lint` (~3-5s) or `npm run audit` for full quality gate.
  - **Safe-Commit Gatekeeper**: `npm run audit:warnings-diff` is strictly reserved for the safe-commit pipeline to diff warnings against `origin/main`.

---

## 🧭 Navigation Hub, Documentation Taxonomy & Anti-Junk-Drawer Policy

### 📚 5-Tier Documentation Taxonomy
To prevent clutter, confusion, and document degradation, documentation in `references/` is strictly divided into 5 distinct tiers:

1. **`references/rules/` (Developer & Engine Governance ONLY)**: Invariable architectural laws, coding constraints, and low-level engine integration rules (Showdown worker interface, 4-seat generalization, zero-timers, Zero-Any TypeScript, Git safety, Save Shield). 🛑 **NEVER put gameplay feature rules, drop tables, or daycare/egg mechanics here.**
2. **`references/systems/` (Gameplay Systems & Features SSoT)**: The dedicated Single Source of Truth for specific in-game features (`breeding_manual.md` for Daycare/Eggs/Vigor, `gym_system_manual.md` for Gyms, `obedience_mechanics_manual.md` for Obedience/Level Caps, `item_system_manual.md` for Items/Crafting, `capturing_manual.md` for Capture Math, `evolution_manual.md` for Evolutions, `ev_mechanics_manual.md` for EVs, `war_system_manual.md` for Faction War, `spawn_grid_manual.md` for Spawns).
3. **`references/battle/` (Combat Arena & Battle Execution)**: Battle state transitions, Showdown event translation, GSAP combat animations, combat camera, status ailments, and weather standards.
4. **`references/core/` (Mathematical Formulas & UI/UX Standards)**: Central mathematical formulas (Damage, Catch rates, Stats, Escape, Minigames) and global UI/UX design tokens.
5. **`references/technical/` (Infrastructure & Frontend Tech)**: GPU optimization, SASS styling, asset pipelines, DBRouter proxy architecture, SQL dialect translation, legacy migration, and Supabase infrastructure.

### 🌳 Document Routing Decision Tree

Before writing or updating any rule, manual, or architectural lesson, consult this decision tree to prevent documentation duplication:

| If your improvement/rule relates to... | Canonical Document (SSoT) | DO NOT duplicate in... |
| :--- | :--- | :--- |
| **Compiler rules, TypeScript unions, type casting, JSON wrappers, security** | [typescript_conventions.md](./references/rules/typescript_conventions.md) | `rules/game_engine_and_state.md` |
| **E2E Playwright tests, fuzzer history, #id locators, test timeouts** | [testing_and_simulations.md](./references/rules/testing_and_simulations.md) | `qa/browser_testing_manual.md` |
| **DBRouter isolation, Save Shield, SQL migrations, DB permissions** | [database_and_persistence.md](./references/rules/database_and_persistence.md) | `technical/save_system_manual.md` |
| **Git operations, scratch files, destructive rollbacks, root setup scripts** | [git_and_workflow_safety.md](./references/rules/git_and_workflow_safety.md) | `SKILL.md` |
| **Showdown engine delegation, 4 seats, UID team sync, illegal Pokemon lifecycle** | [game_engine_and_state.md](./references/rules/game_engine_and_state.md) | `battle/battle_mechanics_manual.md` |
| **Daycare, Breeding, Hatching, Egg capacity limits, Baby rewards, Vigor** | [breeding_manual.md](./references/systems/breeding_manual.md) | `rules/game_engine_and_state.md` |
| **Obedience level caps, Met Level checks, disobedience RNG rolls, anti-cheat flags** | [obedience_mechanics_manual.md](./references/systems/obedience_mechanics_manual.md) | `systems/friendship_mechanics_manual.md` |
| **Battle engine logic, Showdown worker sync, choice loops, recharge states** | [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md) | `rules/game_engine_and_state.md` |
| **Major & volatile status conditions, triggers, recovery, immunities** | [status_ailments_manual.md](./references/battle/status_ailments_manual.md) | `battle/battle_mechanics_manual.md` |
| **Mathematical formulas (Damage, Stats, EXP, Minigames, Stage multipliers)** | [game_formulas_manual.md](./references/core/game_formulas_manual.md) | `battle/battle_mechanics_manual.md` |
| **Combat animations, GSAP timelines, sprite FX, Void Protocol, feetCache** | [animation_standards.md](./references/battle/animation_standards.md) | `technical/sass_styling_manual.md` |
| **Active battle F5 reload, save serialization, anti-cheat minigames** | [battle_persistence_and_anti_cheat_manual.md](./references/battle/battle_persistence_and_anti_cheat_manual.md) | `rules/database_and_persistence.md` |
| **Showdown protocol event translation to Spanish logs (`showdownBridge`)** | [bridge_guide.md](./references/battle/bridge_guide.md) | `battle/battle_mechanics_manual.md` |
| **Database schemas, SQLite WASM, query proxies, Supabase RPCs** | [dbrouter_manual.md](./references/technical/dbrouter_manual.md) | `rules/database_and_persistence.md` |
| **PostgreSQL to SQLite migration translation, 10-step table recreation** | [db_translation_manual.md](./references/technical/db_translation_manual.md) | `rules/database_and_persistence.md` |
| **Legacy code modernization protocol to Vue 3 Composition API & GSAP** | [legacy_migration_manual.md](./references/technical/legacy_migration_manual.md) | `core/ui_ux_standards.md` |
| **Save data schema, Valibot parsing, encryption, account storage** | [save_system_manual.md](./references/technical/save_system_manual.md) | `rules/database_and_persistence.md` |
| **SASS mixins, CSS variables, GBA font rules, visual styling** | [sass_styling_manual.md](./references/technical/sass_styling_manual.md) | `core/ui_ux_standards.md` |
| **Step-by-step QA testing protocols, DevTools shortcuts, verification matrix** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md) | `rules/testing_and_simulations.md` |
| **Manual QA verification of battle animations, forced switches, flee & teleport, catch** | [manual_testing_battle_animations.md](./references/qa/manual_testing_battle_animations.md) | `qa/browser_testing_manual.md` |
| **Pre-release audit checklists, gate verifications, release protocols** | [audit_checklist.md](./references/qa/audit_checklist.md) | `qa/validation_manual.md` |
| **Content design, event authoring, quest crafting, and dialog trees** | [content_creation_manual.md](./references/content/content_creation_manual.md) | `core/ui_ux_standards.md` |
| **Low power mode, battery savings, mobile rendering throttling** | [low_power_mode_manual.md](./references/technical/low_power_mode_manual.md) | `technical/gpu_optimization_manual.md` |
| **Specific gameplay systems (Daycare, Gyms, Items, War, Trade, Spawn Grid, EV, Capture)** | [systems/*_manual.md](./references/systems/) | `core/ui_ux_standards.md` |
| **Generation-specific capturing mechanics (Gen I through Gen IX)** | [capturing_manual.md](./references/systems/capturing_manual.md) | `core/game_formulas_manual.md` |
| **High-level game mechanics architecture, GameBus, DND sorting, Void Protocol** | [game_mechanics_manual.md](./references/core/game_mechanics_manual.md) | `rules/game_engine_and_state.md` |
| **Network loopback, Hairpin NAT, MikroTik multi-WAN load balancing** | [network_infrastructure_manual.md](./references/technical/network_infrastructure_manual.md) | `technical/supabase_infrastructure_manual.md` |

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
- [Domain Type First Skill](../domain-type-first/SKILL.md)
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

---

## 🛠️ Aesthetic & Quality Audit Checklist

Before declaring any task completed, verify code against this mandatory checklist:

- [ ] **Architectural Reuse**: Have I extracted and reused existing components/base classes without duplicating logic?
- [ ] **GPU Acceleration**: Have I applied layer promotion (`will-change: transform`) and object pooling on animated/heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated, sharp, and properly rendered with appropriate font fallbacks ('ñ' handled)?
- [ ] **CLI-First State Verification**: Have I verified game states via `window.__VITE_DEBUG__` console commands?
- [ ] **Proportional Verification**: For documentation/skill edits, does `npm run lint:md` pass cleanly? For code development, does `npm run audit` pass with 0 errors? (The command `npm run audit:warnings-diff` is strictly reserved for the safe-commit pipeline).
- [ ] **Fallow Score Compliance**: Does `npm run fallow:health` report a score of 85 or higher?
- [ ] **Language Parity**: Are all repository files (.ts, .vue, .md, skills) written exclusively in English?
