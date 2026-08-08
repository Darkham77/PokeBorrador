---
name: project-standards
description: Core governance and architectural standards for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500/1000-line SRP modularity, Zero-Ignore TypeScript policy, event-driven zero-timers, DBRouter persistence isolation, and E2E simulation rules. Acts as the primary Navigation Hub to access technical manuals and specialized rule modules. Make sure to load and consult this skill whenever starting a new task, making architectural changes, touching core engine/stores/components, refactoring code, writing tests, or reviewing project standards.
---

# Project Standards (Core Governance & Navigation Hub)

This skill defines the immutable core DNA and architectural standards of Poké Vicio. It provides comprehensive governance for design, code quality, security, testing, persistence, and workflow safety, as well as explicit instructions on how and when to consult specialized reference manuals.

- **Mandatory Skill Invocation**: ALWAYS load and follow the instructions in the `domain-type-first` skill (`@/domain-type-first` / `/.agents/skills/domain-type-first/SKILL.md`) whenever creating, modifying, reviewing, or generating any data type, DTO, interface field, finite domain constant, schema, generated database, or domain boundary validation.
- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **Zero Audit Failures & Warnings-Diff Mandate**: Under NO circumstances are audit failures allowed in any commit. You MUST run `npm run audit:warnings-diff` before committing, and it MUST return exactly 0 issues (0 errors across the entire project, and 0 new warnings in modified/added/untracked files compared to `origin/main`).
- **Mandatory DOX Navigation**: You MUST always use the `dox-navigator` skill (or trigger the `/dox-navigator` command) to analyze the project context, search for files, components, and manuals, and update any index or documentation within the project.

---

## 🏛️ Core Architectural & Quality Mandates

### 1. Hybrid Retro-Modern Identity
- **Visual Design**: Blends modern UI shells (premium gradients, relief borders, shining accents) with a retro pixel art heart (sharp rendering, pixelated fonts and game sprites).
- **GSAP Exclusive Mandate**: All UI and battle animations MUST be implemented using GSAP. Manual CSS `@keyframes` or JS timers (`setTimeout`/`setInterval`) for animation flow are strictly forbidden.
- **SASS Integrity**: SASS function capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`). Write standard lowercase CSS filters/transforms.
- **GPU Efficiency & Performance**: Strict use of Texture Atlases, Object Pooling, layer promotion (`will-change: transform`), and filter chain optimizations (`pokemon-outline-performance`) to guarantee 60 FPS fluidity.
- **GBA Font Spanish Capitalization Constraint**: The primary pixel font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (replacing 'Ñ' with 'ñ') to avoid rendering artifacts.

### 2. Code Modularity & Quality (500/1000-Line Limit)
- **Modularity Limits**: Files exceeding **500 lines** trigger modularization recommendations. No logic or UI component file may exceed **1000 lines** (hard limit; static databases and metadata in `src/data/` are exempt).
- **Absolute Prohibition on Magic Numbers & Value-Hardcoding**: Inline numeric literals directly inside business logic, UI components, workers, or tests are strictly forbidden. All numbers MUST be declared as descriptive `readonly` named constants or `as const` config objects. Shared constants used in multiple files MUST be exported from a central constants module. Constant identifiers MUST NOT include their numeric values (e.g. `ARCHAEOLOGY_CAVE_BASE_WEIGHT` is required, `ARCHAEOLOGY_CAVE_BASE_WEIGHT_10` is strictly forbidden). String literals with values/fractions/regex helpers (`"random(-10, 10)"`) MUST use `// no-magic`.

  #### Suppression Comment Protocol (`// magic-ok`, `// no-magic`, `// number-ok`)

  These inline suppression tokens are **escape hatches for genuinely un-nameable values**, NOT a way to pass the auditor without fixing real problems. An agent adding a suppression comment to avoid work is **cheating** — the auditor will still catch it in `--strict` mode and code review will reject it.

  **✅ ALLOWED — the value is genuinely un-nameable:**

  | Case | Example | Why allowed |
  | :--- | :--- | :--- |
  | GSAP string helpers with embedded math | `"random(-10, 10)"` | String literal — no numeric token to name |
  | Template strings embedding percentages | `"1/16 HP por turno"` | Human-readable text, not a domain threshold |
  | Rendering math that is formula-derived | `(0.7 + seed * 0.8) * factor // magic-ok` | Formula coefficients documented in the formula itself |
  | Nearest-match search sentinel | `let minDiff = 11 // magic-ok` | Algorithmic sentinel larger than max domain value |
  | Repeated shake animation literals in a single GSAP chain | `{ x: -4 }, { x: 4 } // magic-ok` | One-off animation keyframes with no domain meaning |

  **❌ FORBIDDEN — the value has a domain name that MUST be extracted:**

  | Case | Example | Correct fix |
  | :--- | :--- | :--- |
  | Game probability thresholds | `if (randRoll < 10) diff = 'easy' // magic-ok` | `const DIFF_EASY_THRESHOLD = 10` |
  | Game economy values (costs, rewards) | `cost: 5000 // magic-ok` | `const MISSION_6H_COST = 5_000` |
  | Sleep/delay durations in any app code | `await sleep(1000) // magic-ok` | `const TRANSITION_DELAY_MS = 1_000` |
  | Item buff durations | `BUFF_DURATION_60_MIN_SEC // magic-ok` on the call site | Already named — remove the suppression |
  | Stat floor/ceiling business values | `ivFloor: 5 // magic-ok` | `const MISSION_6H_IV_FLOOR = 5` |
  | `Math.max/min` clamping bounds from game design | `Math.min(STAGE_MAX_BOUND, ...)` with no declaration | Declare `const STAGE_MAX_BOUND = 6` |

  > 🔴 **Rule:** If a human reading the constant name can understand the domain intent without looking up the value, it's nameable and MUST be named. The test is not "can I name it?" but "is naming it clearer than not naming it?" — if yes, name it.
- **Mandatory Typed Domain Wrappers for JSON Files**: Directly importing raw `.json` files containing domain entities (items, species, moves, abilities, sets) is strictly forbidden. Every `.json` data file MUST be wrapped by a co-located TypeScript module exporting constants bounded by strict TypeScript domain union types (`ItemId`, `PokemonSpeciesId`, `AbilityId`, `PokemonMoveId`).

### 3. Architectural Reuse, Polymorphism & 4-Seat Compatibility
- **Zero-Duplication & Inheritance Mandate**: Duplicating logic, structures, components, or control flows anywhere in the codebase is strictly forbidden. Refactor to extract common base classes, parameterized composables, or generic extensible components before writing new code.
- **Mandatory 4-Seat Generic Compatibility**: Every battle orchestration, state synchronization, worker payload processing, and UI component MUST be strictly designed and generalized to support up to 4 battle seats (`p1`, `p2`, `p3`, `p4`) dynamically. Hardcoding logic for only 2 seats is strictly prohibited.

### 4. TypeScript Integrity & Zero-Ignore Policy
- **Zero-Ignore & Zero-Any**: `@ts-ignore`, `@ts-nocheck`, and `any` are strictly forbidden across the entire repository (including Web Workers and E2E simulation files).
- **Mandatory Domain-Type-First Governance**: Every data type, domain constant, schema, DTO, or boundary contract MUST follow `@/domain-type-first`. Naked `string` declarations for finite domains, open index signatures (`[key: string]: unknown`), wildcard unions (`| string`), open sets/maps (`new Set<string>()`/`new Map()`), and inline type casts (`as Type`, `as any`) are strictly forbidden.
- **Absolute Prohibition on `Set`/`Map` for Domain Types**: `new Set<string>()` and `new Map()` are mutable runtime data structures, NOT type definitions. Finite domains MUST use `as const` arrays + `(typeof ARRAY)[number]` for typing, and `(ARRAY as readonly string[]).includes(val)` for runtime validation.
- **Prohibition on Type Assertion Bypasses**: Type assertions (`as Type`, `as unknown as T`) or helper functions created solely to wrap double casts to evade type checking are strictly prohibited. All data boundaries MUST use explicit boundary adapter functions.

### 5. Event-Driven Simulation Sync & Zero-Timer Policy
- **Event-Driven Architecture**: Application logic, state transitions, save loading, and component orchestration MUST be 100% event-driven (using promises, GSAP timelines, custom events, or store state changes).
- **Zero-Timer Mandate**: `setTimeout`, `setInterval`, numeric timers, or race timeouts are strictly forbidden in application and game logic. Timers are ONLY permitted in utility scripts (`node:timers/promises`) or in E2E tests as a maximum fail-safe cap to terminate stuck test runs.

### 6. Zero-Tolerance Turn Failure & Anti-Hasty-Patch Mandate
- **Fail-Fast Turn Execution**: In Playwright E2E simulations, a single turn failure, unhandled rejection, or desync MUST immediately abort execution with a descriptive error. Retries, silent skips, and spin-loops are strictly forbidden.
- **Prohibition on Hasty Patches & Fallbacks**: Inventing hasty fallbacks (e.g. returning `'default'`, fallback moves, or mock objects) or swallowing errors (`.catch(() => true)`) to force tests or simulations to pass is strictly forbidden. Root causes MUST be diagnosed and fixed in `src/`.
- **100% Shared Execution Code**: Headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E simulations MUST consume the same choices via the literally same `ShowdownBattleRunner` class to guarantee absolute execution parity.
- **Mandatory ID-Based UI Selection**: Locating UI components in Playwright tests by text matching or regex labels is strictly forbidden. All interactive UI components MUST have unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, etc.).

### 7. Database Isolation & Persistence Safety
- **Context Isolation (DBRouter)**: Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via `DBRouter`. Run `npm run validate:sql` before database commits.
- **Zero-Pokemon Save Shield**: Saving game state (to IndexedDB, LocalStorage, OPFS, or Supabase) is strictly forbidden if the team and box contain 0 Pokémon OR if `starterChosen` is `false`. Abort save operations immediately if met.
- **Prohibition on Remote Database Updates**: AI agents MUST NEVER run or execute database update/migration scripts against remote, Docker-based, or shared database profiles (`server_franco`, `cloud`, `official_prod`). Remote updates are strictly reserved for manual execution by the user.
- **Simulator Parity & Status Format**: Showdown simulator status clearance/assignment MUST use `''` (empty string) to denote no status (assigning `null` crashes the simulator). Client-side Vue store Pokémon representations may use `null`.

### 8. Git Safety, Workflow & Security
- **Rollback Confirmation Protocol**: Before executing destructive Git operations (`git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly request user confirmation, disclosing the exact commands.
- **Protection of Uncommitted Files**: Before running bulk modification scripts on uncommitted files, create temporary backups inside `scratch/`.
- **Scratch Directory Mandate**: Temporary reports, text summaries, and debug outputs MUST be stored exclusively in `scratch/`.
- **Autonomous Commit & Push Prohibition**: Commit flows MUST NOT be run autonomously without explicit user instructions. `git push` is forbidden for agents.
- **Strict Zero-Hiding Security Mandate**: Suppressing or hiding security vulnerabilities (CWE path traversals, SSRF risks) using ignore files (`.fallowrc.json`), inline comments (`// fallow-ignore`), or exclusions is strictly forbidden. Every security finding MUST be resolved at its source via path sanitization and boundary checks.

---

## 📖 How to Use Reference Manuals & Rule Modules

When performing specific tasks, consult the corresponding reference manuals to obtain deep-dive architectural rules, historical formulas, and step-by-step technical guides:

1. **Working with Data Types, Interfaces, or JSON Catalogs**:
   - Consult `@/domain-type-first` (`.agents/skills/domain-type-first/SKILL.md`) and [typescript_conventions.md](./references/rules/typescript_conventions.md).
   - Use these when adding new Pokémon species, items, moves, status effects, or DTO contracts.

2. **Writing E2E Playwright Tests, Fuzzing, or Simulator Debugging**:
   - Consult `@/project-browser-testing` (`.agents/skills/project-browser-testing/SKILL.md`), [browser_testing_manual.md](./references/qa/browser_testing_manual.md), and [testing_and_simulations.md](./references/rules/testing_and_simulations.md).
   - Follow the mandatory `#id` locator rules, fail-fast turn loops, and `ShowdownBattleRunner` shared execution patterns.

3. **Developing Battle Mechanics, Showdown Integrations, or Moves**:
   - Consult [bridge_guide.md](./references/battle/bridge_guide.md), [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md), [game_engine_and_state.md](./references/rules/game_engine_and_state.md), and the canonical source of truth under [external/pokemon-showdown-code/](../../../external/pokemon-showdown-code/).

4. **Modifying Persistence, DBRouter, or Save Loaders**:
   - Consult [save_system_manual.md](./references/technical/save_system_manual.md), [dbrouter_manual.md](./references/technical/dbrouter_manual.md), and [database_and_persistence.md](./references/rules/database_and_persistence.md).
   - Enforce the Save Shield (0-Pokémon protection) and SQLite/Supabase separation.

5. **Environment Configuration, Dependency Audits, or Node Scripts**:
   - Consult [validation_manual.md](./references/qa/validation_manual.md), [git_and_workflow_safety.md](./references/rules/git_and_workflow_safety.md), [mikrotik_routing_manual.md](./references/technical/mikrotik_routing_manual.md), and root setup scripts (`setup-windows.ps1` / `setup-linux.sh`).

---

## 🧭 Navigation Hub

### 📜 Specialized Agent Rule Modules

| Domain / Topic | Specialized Reference Rule Module |
| :--- | :--- |
| **All Rules Index** | [references/rules/README.md](./references/rules/README.md) |
| **TypeScript & Data Integrity** | [typescript_conventions.md](./references/rules/typescript_conventions.md) |
| **Testing & Simulations** | [testing_and_simulations.md](./references/rules/testing_and_simulations.md) |
| **Database & Persistence** | [database_and_persistence.md](./references/rules/database_and_persistence.md) |
| **Git & Workflow Safety** | [git_and_workflow_safety.md](./references/rules/git_and_workflow_safety.md) |
| **Game Engine & State** | [game_engine_and_state.md](./references/rules/game_engine_and_state.md) |

### 📘 Technical & Architecture Manuals

| Domain | Reference Manual |
| :--- | :--- |
| **Domain Type First** | [.agents/skills/domain-type-first/SKILL.md](../../.agents/skills/domain-type-first/SKILL.md) |
| **Markdown Standards** | [markdown_standards.md](./references/technical/markdown_standards.md) |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md) |
| **Browser Testing Manual** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md) |
| **Save System Manual** | [save_system_manual.md](./references/technical/save_system_manual.md) |
| **DBRouter Manual** | [dbrouter_manual.md](./references/technical/dbrouter_manual.md) |
| **Asset Service Manual** | [asset_service_manual.md](./references/technical/asset_service_manual.md) |
| **Animated Sprites Manual**| [animated_sprites_manual.md](./references/technical/animated_sprites_manual.md) |
| **GPU Optimization Manual**| [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md) |
| **SASS Styling Manual** | [sass_styling_manual.md](./references/technical/sass_styling_manual.md) |
| **Dependency Management** | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |
| **Supabase Infrastructure**| [supabase_infrastructure_manual.md](./references/technical/supabase_infrastructure_manual.md) |
| **MikroTik Routing Manual** | [mikrotik_routing_manual.md](./references/technical/mikrotik_routing_manual.md) |
| **Showdown Bridge Guide**| [bridge_guide.md](./references/battle/bridge_guide.md) |
| **Showdown Source Code** | [external/pokemon-showdown-code/](../../../external/pokemon-showdown-code/) Source code of Pokémon Showdown (SSoT) |
| **Legacy Migration Hub** | [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md) |
| **DB Dialect Translation** | [db_translation_manual.md](./references/migration/db_translation_manual.md) |
| **PostgreSQL to SQLite** | [postgreSQL_to_SQLite.md](./references/migration/postgreSQL_to_SQLite.md) |

### 📚 Game Mechanics & Systems References

| Domain | Reference Documents |
| :--- | :--- |
| **Battle Systems** | - [Battle Mechanics](./references/battle/battle.md)<br>- [Battle Mechanics Manual](./references/battle/battle_mechanics_manual.md)<br>- [Battling Basics](./references/battle/battling-basics.md)<br>- [Animation Standards](./references/battle/animation_standards.md)<br>- [Combat Camera Manual](./references/battle/combat_camera_manual.md)<br>- [Weather Mechanics](./references/battle/weather_mechanics_standards.md)<br>- [Status Ailments](./references/core/status-ailments.md) |
| **Core Systems & UI** | - [Game Mechanics Manual](./references/core/game_mechanics_manual.md)<br>- [Game Formulas Manual](./references/core/game_formulas_manual.md)<br>- [Time System Manual](./references/core/time_system_manual.md)<br>- [UI/UX Standards](./references/core/ui_ux_standards.md) |
| **Stats & Growth** | - [Stat Mechanics](./references/systems/stats.md)<br>- [Stat Stages](./references/core/stat-stages.md)<br>- [EVs & Natures](./references/systems/evs-natures-and-math.md)<br>- [EV Mechanics Manual](./references/systems/ev_mechanics_manual.md)<br>- [Gen I Stat Modification](./references/systems/gen-i-stat-modification.md) |
| **Evolutions & Breeding** | - [Evolution List](./references/systems/evolution-list.md)<br>- [Evolution Manual](./references/systems/evolution_manual.md)<br>- [Breeding Manual](./references/systems/breeding_manual.md) |
| **Capturing Mechanics** | - [Gen I Capturing](./references/systems/capturing/gen-i-capturing.md)<br>- [Gen I Safari Zone](./references/systems/capturing/gen-i-safari-zone.md)<br>- [Gen II Capturing](./references/systems/capturing/gen-ii-capturing.md)<br>- [Gen III & IV Capturing](./references/systems/capturing/gen-iii-iv-capturing.md)<br>- [Gen V Capturing](./references/systems/capturing/gen-v-capturing.md)<br>- [Gen VI & VII Capturing](./references/systems/capturing/gen-vi-vii-capturing.md)<br>- [Gen VIII Capturing](./references/systems/capturing/gen-viii-capturing.md)<br>- [Gen IX Capturing](./references/systems/capturing/gen-ix-capturing.md) |
| **Game Systems & World** | - [Encounter Manual](./references/systems/encounter_manual.md)<br>- [Item System Manual](./references/systems/item_system_manual.md)<br>- [Gym System Manual](./references/systems/gym_system_manual.md)<br>- [War System Manual](./references/systems/war_system_manual.md)<br>- [Trade & Social Manual](./references/systems/trade_social_manual.md)<br>- [Spawn Grid Manual](./references/systems/spawn_grid_manual.md)<br>- [Dungeon Equipment](./references/systems/mystery_dungeon_equipment_standards.md)<br>- [Gen III Roulette](./references/systems/gen-iii-roulette.md)<br>- [Sinnoh Honey Trees](./references/systems/sinnoh_honey-trees.md)<br>- [Pokéwalker](./references/systems/pokewalker.md) |
| **RNG & Technical** | - [Gen I RNG Mechanics](./references/systems/gen-i-rng.md) |

---

## 🛠️ Aesthetic & Quality Audit Checklist

Before declaring any task completed, verify code against this mandatory checklist:

- [ ] **Architectural Reuse**: Have I extracted and reused existing components/base classes without duplicating logic?
- [ ] **GPU Acceleration**: Have I applied layer promotion (`will-change: transform`) and object pooling on animated/heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated, sharp, and properly rendered with appropriate font fallbacks ('ñ' handled)?
- [ ] **CLI-First State Verification**: Have I verified game states via `window.__VITE_DEBUG__` console commands?
- [ ] **Zero-Warning & Zero-Error**: Do `npm run lint` and `npm run validate:sql` pass with 0 errors and 0 warnings?
- [ ] **Fallow Score Compliance**: Does `npx fallow health --score` report a score of 85 or higher?
- [ ] **Linter Cache Compliance**: Have I executed validation exclusively via `npm run lint` or `npm run lint:fix` to preserve `.eslintcache`?
- [ ] **Language Parity**: Are all repository files (.ts, .vue, .md, skills) written exclusively in English?
