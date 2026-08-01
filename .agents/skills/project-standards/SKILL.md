---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500/1000-line modularity (SRP focus), and Zero-Ignore TypeScript policy. Acts as a Navigation Hub to access technical manuals.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals and local DOX indexes (`AGENTS.md`) to ensure a lightweight and effective rule base.

- **Mandatory Skill Invocation**: ALWAYS load and follow the instructions in the `domain-type-first` skill (`@/domain-type-first` / `/.agents/skills/domain-type-first/SKILL.md`) whenever creating, modifying, reviewing, or generating any data type, DTO, interface field, finite domain constant, schema, DTO, generated database, or domain boundary validation.
- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **Zero Audit Failures & Warnings-Diff Mandate**: Under NO circumstances are audit failures allowed in any commit. You MUST run `npm run audit:warnings-diff` before committing, and it MUST return exactly 0 issues (0 errors across the entire project, and 0 new warnings in modified/added/untracked files compared to `origin/main`).
- **Mandatory DOX Navigation**: You MUST always use the `dox-navigator` skill (or trigger the `/dox-navigator` command) to analyze the project context, search for files, components, and manuals, and update any index or documentation within the project.

## 🧭 Navigation Hub

Consult these global and cross-functional manuals for project-wide standards (domain-specific manuals are indexed directly inside their corresponding module `AGENTS.md` files):

| Domain                   | Reference Manual                                                                          |
| :----------------------- | :---------------------------------------------------------------------------------------- |
| **Domain Type First**    | [.agents/skills/domain-type-first/SKILL.md](../../.agents/skills/domain-type-first/SKILL.md) |
| **Markdown & Docs**      | [markdown_standards.md](./references/technical/markdown_standards.md)                     |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md)                              |
| **Testing & Simulation** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md)                    |
| **Save & Persistence**   | [save_system_manual.md](./references/technical/save_system_manual.md)                     |
| **Showdown Bridge Guide**| [BRIDGE-GUIDE.md](./references/battle/showdown/BRIDGE-GUIDE.md)                           |
| **Showdown Reference**  | [external/pokemon-showdown-code/](../../../external/pokemon-showdown-code/) Source code of Pokémon Showdown (Source of Truth)                     |
| **EV & Stat Mechanics**  | [ev_mechanics_manual.md](./references/systems/ev_mechanics_manual.md)                     |
| **Legacy Migration Hub** | [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md)           |
| **Weather Mechanics**    | [weather_mechanics_standards.md](./references/battle/weather_mechanics_standards.md)       |
| **Dungeon Equipment**    | [mystery_dungeon_equipment_standards.md](./references/systems/mystery_dungeon_equipment_standards.md) |

### 📚 Core Game Mechanics References

These reference manuals (imported from canonical sources) document standard game behaviors, formulas, and historical mechanics:

| Domain | Reference Documents |
| :--- | :--- |
| **Battle Systems** | - [Battle Mechanics](./references/battle/battle.md)<br>- [Battling Basics](./references/battle/battling-basics.md)<br>- [Status Ailments](./references/core/status-ailments.md) |
| **Stats & Growth** | - [Stat Mechanics](./references/systems/stats.md)<br>- [Stat Stages](./references/core/stat-stages.md)<br>- [EVs & Natures](./references/systems/evs-natures-and-math.md)<br>- [Gen I Stat Modification](./references/systems/gen-i-stat-modification.md) |
| **Evolutions** | - [Evolution List](./references/systems/evolution-list.md) |
| **Capturing Mechanics** | - [Gen I Capturing](./references/systems/gen-i-capturing.md)<br>- [Gen I Safari Zone](./references/systems/gen-i-safari-zone.md)<br>- [Gen II Capturing](./references/systems/gen-ii-capturing.md)<br>- [Gen III & IV Capturing](./references/systems/gen-iii-iv-capturing.md)<br>- [Gen V Capturing](./references/systems/gen-v-capturing.md)<br>- [Gen VI & VII Capturing](./references/systems/gen-vi-vii-capturing.md)<br>- [Gen VIII Capturing](./references/systems/gen-viii-capturing.md)<br>- [Gen IX Capturing](./references/systems/gen-ix-capturing.md) |
| **Special Systems** | - [Gen III Roulette](./references/systems/gen-iii-roulette.md)<br>- [Sinnoh Honey Trees](./references/systems/sinnoh_honey-trees.md)<br>- [Pokéwalker](./references/systems/pokewalker.md) |
| **RNG & Technical** | - [Gen I RNG Mechanics](./references/technical/gen-i-rng.md) |

### 🛠️ Migration & Technical Support

- **DB Technical Notes**: [references/migration/](./references/migration/)

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity
- **Visual Design**: Blends modern UI shells (premium gradients, relief borders) with a retro pixel art heart (sharp rendering, pixelated fonts).
- **Rule Isolation**: Standard styling, typography layout clipping, and GPU rules are delegated to [src/components/AGENTS.md](../../../src/components/AGENTS.md) and [src/styles/AGENTS.md](../../../src/styles/AGENTS.md).

### 2. Modularity & Code Quality
- **500/1000-Line Rule**: Modularization is recommended for files exceeding **500 lines** (triggers a warning). No logic or style file may exceed **1000 lines** (hard limit, excluding static databases and metadata).
- **Absolute Prohibition on Magic Numbers (Named Constants Mandate)**: It is STRICTLY FORBIDDEN to use inline numeric literals ("magic numbers", e.g., hardcoded offsets, arbitrary timeouts, max attempts, scaling factors, or math thresholds like `86400000`, `18`, `0.75`, `5000`) directly inside business logic, UI components, workers, or tests. All numbers MUST be declared as descriptive `readonly` named constants (or `as const` config objects) at module scope or in dedicated constants modules (e.g. `export const MAX_NICKNAME_LENGTH = 18;`). If a constant is used or referenced across more than one file, it MUST be extracted and exported from a shared constants module to prevent duplication and guarantee a single source of truth.
- **Decoupling and SSoT**: Architectural constraints, SSoT declarations, and validation routines reside in their respective child directories' `AGENTS.md`.
- **Zero-Cloning & Zero-Fallback Mandates**: It is STRICTLY FORBIDDEN to clone, shallow-copy (`{ ... }`), or replace active model instances (like active combatants or team members) to trigger updates. Always use UID-based resolution to refer to the Single Source of Truth (`gameStore.state.team` or `gameStore.state.box`) and perform in-place mutations directly on the references to maintain reactive bindings and prevent desynchronization bugs. Furthermore, it is STRICTLY FORBIDDEN to implement runtime compatibility adapters, silent fallback values, default return references, or mock coordinates (e.g. returning active pokemon references, default coordinates, default objects, or empty strings when a UID resolution, ID lookup, asset path, or sprite feet coordinate mapping fails). If any property, asset, sprite, or mapping is missing, IT IS A REAL CODE/DATA BUG; under no circumstances may code silently fallback to default values. The system MUST fail loudly with explicit errors to expose the missing data and force fixing it at the source. Under no circumstances should `sanitizePokemon` or any equivalent mechanism silently auto-heal or patch incorrect/missing stats, items, or moves. Under no circumstances may a validation failure silently fallback to default values (like empty lists or default objects) and save the corrupted state. The system must fail loudly with descriptive errors to force repairing the underlying data causes. If a load or save validation fails, it must fail loudly, abort the transaction immediately, and the save system/options must remain disabled/blocked to prevent overwriting and data loss. Never use fallbacks when looking up by ID under any circumstances; immediate failure is required to expose bugs.
- **Active Generation Single Source of Truth**: It is STRICTLY FORBIDDEN to hardcode the Pokémon Showdown generation (`genX`, `gen5`, etc.) anywhere in the codebase (including workers, fuzzer engines, replayers, and parity tools). All battle initializations and formats MUST dynamically reference `ACTIVE_GENERATION` (e.g. constructing `gen${ACTIVE_GENERATION}customgame` or calling `getShowdownFormatId()`). The only exception is in specific unit or integrity tests whose sole purpose is to test/validate a specific generation's behavior.
- **Mandatory 4-Seat Generic Compatibility Mandate**: Every battle orchestration, state synchronization, worker payload processing, and UI component MUST be strictly designed, modularized, and generalized to support up to 4 battle seats (`p1`, `p2`, `p3`, `p4`) dynamically. Hardcoding logic, branches, or state variables for only 2 seats (`p1`/`p2`) is STRICTLY FORBIDDEN. Whenever code for separate seats is encountered or introduced, it MUST be refactored into a single generic, parameterized function or loop over seat IDs/indices without code duplication.
- **Mandatory Fallow Health Score Mandate (Minimum 85/100)**: The overall codebase health score computed by Fallow (`npx fallow health --score`) MUST be at least **85/100**. Scores below 85 are strictly non-compliant. Whenever the score is under 85, developers and AI agents MUST inspect Fallow's recommendations (`npx fallow health --targets --hotspots`), eliminate dead code, lower function/module complexity, and refactor the code iteratively until the health score is strictly 85 or higher.
- **Mandatory Domain-Type-First Governance**: Every data type, domain constant, schema, DTO, or boundary contract MUST strictly follow the `domain-type-first` skill (`.agents/skills/domain-type-first/SKILL.md`). Unconstrained raw `string` declarations for finite domains, open index signatures (`[key: string]: unknown`), wildcard unions (`| string`), open sets/maps (`new Set<string>()`/`new Map()`), and inline type casts (`as Type`, `as any`) are STRICTLY FORBIDDEN. All domain values must derive from canonical `as const` tuples/objects, and invalid domain values MUST fail at compile time or fail loudly at trust boundaries using explicit boundary guards (`requireDomainId()`).
- **Strict Data Schema & Zero-Ambiguity Type Governance**: It is STRICTLY FORBIDDEN to define ambiguous union types that mix multiple representations of missing or default data (e.g. mixing `''` and `null` in the same type definition). All domain types MUST follow single canonical representations (e.g. matching Showdown's `''` ID standard for statuses). It is STRICTLY FORBIDDEN to use string sink wildcards (`| string`) at the end of enum-like unions, open Index Signatures (`[key: string]: unknown/any`), or duplicate synonym properties (`item`/`heldItem`, `desc`/`description`). Type assertions (`as Type`, `as any`, `as unknown as Record<...>`) to bypass TypeScript compiler checks or evade strict type definitions are STRICTLY PROHIBITED. All data boundaries (Web Workers, DB, UI Stores) MUST use strict boundary adapters instead of type casts.
- **Type-First Mandate (Zero Naked Strings for Domain Values)**: It is STRICTLY FORBIDDEN to declare any variable, field, parameter, or constant with type `string` (or `string[]`) when its value belongs to a finite, known domain. Before using any domain value, you MUST declare a strict TypeScript type first — either a union type, `as const` + `keyof`, or `(typeof ARRAY)[number]` — and use it everywhere that domain appears. Examples of domains that MUST have types: Pokémon natures, Pokémon types, battle weather mechanics, NPC archetypes, player classes, ranked tiers, item categories, obtained methods, volatile status keys, move categories, stat names, faction IDs, mission IDs. A `string` field in an interface or function signature is only acceptable for truly open-ended text (e.g., display messages, user-generated content, item description text). The TypeScript compiler MUST enforce domain constraints at call sites — if passing an invalid value does not produce a compile error, the type is wrong.
- **Absolute Prohibition on `Set`/`Map` for Domain Types**: `new Set<string>()` and `new Map()` are mutable runtime data structures, NOT type declarations. It is STRICTLY FORBIDDEN to use them to represent, enumerate, or validate a finite domain of string values. The canonical pattern for a typed domain is: (1) `export const MY_DOMAIN = ['a', 'b', 'c'] as const;` → (2) `export type MyDomain = (typeof MY_DOMAIN)[number];` → (3) runtime validation via `(MY_DOMAIN as readonly string[]).includes(raw)`. Any existing `Set` used for domain validation MUST be replaced with this pattern.



### 3. Event-Driven Simulation Sync (No Timers)
- **Timer Prohibition**: It is STRICTLY FORBIDDEN to use arbitrary timeouts, manual delays, or sleep functions (e.g. `setTimeout`, `page.waitForTimeout`, `sleep`) to synchronize operations during E2E simulations. All synchronization MUST be event-driven:
  - **E2E Database Isolation**: E2E Playwright simulations must run on isolated in-memory SQLite databases in the browser. Database state persistence to the host disk is disabled.
  - **Clean Template Cache (clean_template.db)**: To avoid running schemas and migrations redundantly for each concurrent test, a pre-migrated empty template database is fetched from `/api/dev-clean-db`. If not present, the first client builds it and uploads it to `/api/dev-export-clean-db`. All subsequent tests download this template to initialize instantly in memory.
  - **Scene & Page Loads**: Wait on Pinia stores' reactive states (`store.isReady === true`) using `waitForStoreReady` instead of guessing latency times.
  - **Mandatory Inheritance and Polymorphism**: It is strictly forbidden to duplicate simulation flows, loop controls, or turn execution logic across simulators. All battle simulations must inherit from a common abstract base class (`BaseBattleSimulation`) that manages the execution loop perfectly, leaving subclasses to implement only their specific specializations (e.g., initialization, cheats, turn assertions). Before writing any new simulator or flow, stop and ask: *"Can I apply inheritance and polymorphism to leverage the existing infrastructure?"*
  - **Fail Fast Principle**: Locators and clicks must use short timeouts (maximum 2-3 seconds for settling, except for initial heavy page loads) to ensure that if a UI block occurs, the test fails immediately and exposes the root cause.

### 4. Zero-Tolerance Turn Failure Rule (Fail-Fast Mandate)

In any E2E or Playwright simulation, **a single turn failure MUST immediately abort the simulation with a descriptive error**. There are no retries, no silent skips, no spin-loops. This applies to all of the following failure conditions:

- UI does not respond to input (`handleBattleInput` returns `false`)
- FSM does not advance within the expected timeout after an input
- State desync detected (e.g., fuzzer choices exhausted while battle is still active)
- Any invalid choice rejection (`INVALID_CHOICE`) from the Showdown simulator
- `waitForWaitInput` or any `waitForFunction` timeout

**PROHIBITION ON HASTY PATCHES & FAKE PASSES**:
- **Never Prioritize Speed Over Correctness**: It is STRICTLY FORBIDDEN to rush fixes, implement quick patches, or invent fallbacks (e.g. returning `'default'`, fallback moves, dummy objects, or default coordinates) to force simulations or tests to pass quickly.
- **Fail Fast & Fix at Source**: Any choice rejection or state mismatch is a real bug in application logic (`src/`) or data parsing. It MUST fail fast and loudly with descriptive errors. Bypassing the failure using fallback choices or silent recovery blocks is strictly prohibited.

**It is STRICTLY FORBIDDEN** to:
- Retry the same turn after a failure
- Skip a choice and continue to the next turn
- Use a `maxTurns` spin-loop as a substitute for a clean termination condition
- Add bypasses, silent catch blocks, exception swallowing, or mock workarounds in E2E simulations or replayers solely to make tests "pass". Any error during simulation is an empirical indicator of a real synchronization failure, missing implementation, or codebase bug in `src/`. The root cause in `src/` MUST be diagnosed and fixed at the source—never hidden, swallowed, or ignored.
- Use differing execution paths, code duplication, or branching logic between headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E browser simulations. They MUST import and execute the LITERALLY SAME shared battle execution module (`showdownExecutor.ts`, `showdownBattleRunner.ts`) via reusable generic functions and base classes to guarantee 100% absolute parity.

Any simulation loop must treat `handleBattleInput` returning `false` as a hard error and `throw` immediately. The `maxTurns` guard exists only to catch runaway battles where the simulator itself never ends — it must never be reached in a healthy battle.

### 5. Mandatory ID-Based UI Selection Mandate
Whenever locating UI components (buttons, modals, cards, inputs, windows) in Playwright tests or E2E simulations, you MUST strictly use unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#modal-close-btn`, etc.). It is **STRICTLY FORBIDDEN** to locate elements by text content, regex labels, or button text (e.g. `has-text(...)`, `:has-text(...)`, text matching). All interactive UI components in Vue templates MUST have unique, descriptive `id` attributes.

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
- [ ] **Fallow Compliance**: Does `npx fallow health --score` report a score of 85 or higher?
- [ ] **Linter Cache Compliance**: Have I executed validation exclusively via `npm run lint` or `npm run lint:fix` (avoiding raw or custom eslint commands) to preserve and utilize the `.eslintcache`?
- [ ] **Language Parity**: Before editing any file, have I verified its primary language and written exclusively in that language? (English file → English edits.)

## 📊 Diagnostic Tools & Reference

All validation, testing, and multi-server setup scripts (`validate:*`, `audit:*`, `supabase:manage`) have been consolidated. Refer to [validation_manual.md](./references/qa/validation_manual.md) for the complete command reference table.


