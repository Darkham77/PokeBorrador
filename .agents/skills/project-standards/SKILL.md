---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500/1000-line modularity (SRP focus), and Zero-Ignore TypeScript policy. Acts as a Navigation Hub to access technical manuals.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals and local DOX indexes (`AGENTS.md`) to ensure a lightweight and effective rule base.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **Zero Audit Failures & Warnings-Diff Mandate**: Under NO circumstances are audit failures allowed in any commit. You MUST run `npm run audit:warnings-diff` before committing, and it MUST return exactly 0 issues (0 errors across the entire project, and 0 new warnings in modified/added/untracked files compared to `origin/main`).

## 🧭 Navigation Hub

Consult these global and cross-functional manuals for project-wide standards (domain-specific manuals are indexed directly inside their corresponding module `AGENTS.md` files):

| Domain                   | Reference Manual                                                                          |
| :----------------------- | :---------------------------------------------------------------------------------------- |
| **Markdown & Docs**      | [markdown_standards.md](./references/technical/markdown_standards.md)                     |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md)                              |
| **Testing & Simulation** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md)                    |
| **Save & Persistence**   | [save_system_manual.md](./references/technical/save_system_manual.md)                     |
| **Showdown Bridge Guide**| [BRIDGE-GUIDE.md](./references/battle/showdown/BRIDGE-GUIDE.md)                           |
| **Showdown Reference**  | [external/pokemon-showdown-code/](../../../external/pokemon-showdown-code/) Source code of Pokémon Showdown (Source of Truth)                     |
| **Legacy Migration Hub** | [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md)           |

### 🛠️ Migration & Technical Support

- **DB Technical Notes**: [references/migration/](./references/migration/)


---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity
- **Visual Design**: Blends modern UI shells (premium gradients, relief borders) with a retro pixel art heart (sharp rendering, pixelated fonts).
- **Rule Isolation**: Standard styling, typography layout clipping, and GPU rules are delegated to [src/components/AGENTS.md](../../../src/components/AGENTS.md) and [src/styles/AGENTS.md](../../../src/styles/AGENTS.md).

### 2. Modularity & Code Quality
- **500/1000-Line Rule**: Modularization is recommended for files exceeding **500 lines** (triggers a warning). No logic or style file may exceed **1000 lines** (hard limit, excluding static databases and metadata).
- **Decoupling and SSoT**: Architectural constraints, SSoT declarations, and validation routines reside in their respective child directories' `AGENTS.md`.
- **Zero-Cloning & Zero-Fallback Mandates**: It is STRICTLY FORBIDDEN to clone, shallow-copy (`{ ... }`), or replace active model instances (like active combatants or team members) to trigger updates. Always use UID-based resolution to refer to the Single Source of Truth (`gameStore.state.team` or `gameStore.state.box`) and perform in-place mutations directly on the references to maintain reactive bindings and prevent desynchronization bugs. Furthermore, it is STRICTLY FORBIDDEN to implement runtime compatibility adapters, silent fallback values, or default reference fallbacks (e.g. returning the active pokemon reference, default fallback objects, or empty strings when a UID resolution or ID lookup/matching fails). Under no circumstances should `sanitizePokemon` or any equivalent mechanism silently auto-heal or patch incorrect/missing stats, items, or moves. Doing so is strictly forbidden. Under no circumstances may a validation failure silently fallback to default values (like empty lists or default objects) and save the corrupted state. The system must fail loudly with descriptive errors to force repairing the underlying data causes. If a load or save validation fails, it must fail loudly, abort the transaction immediately, and the save system/options must remain disabled/blocked to prevent overwriting and data loss. Never use fallbacks when looking up by ID under any circumstances; immediate failure is required to expose bugs.

### 3. Zero-Tolerance Turn Failure Rule (Fail-Fast Mandate)

In any E2E or Playwright simulation, **a single turn failure MUST immediately abort the simulation with a descriptive error**. There are no retries, no silent skips, no spin-loops. This applies to all of the following failure conditions:

- UI does not respond to input (`handleBattleInput` returns `false`)
- FSM does not advance within the expected timeout after an input
- State desync detected (e.g., fuzzer choices exhausted while battle is still active)
- Any invalid choice rejection (`INVALID_CHOICE`) from the Showdown simulator
- `waitForWaitInput` or any `waitForFunction` timeout

**It is STRICTLY FORBIDDEN** to:
- Retry the same turn after a failure
- Skip a choice and continue to the next turn
- Use a `maxTurns` spin-loop as a substitute for a clean termination condition

Any simulation loop must treat `handleBattleInput` returning `false` as a hard error and `throw` immediately. The `maxTurns` guard exists only to catch runaway battles where the simulator itself never ends — it must never be reached in a healthy battle.

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
- [ ] **Linter Cache Compliance**: Have I executed validation exclusively via `npm run lint` or `npm run lint:fix` (avoiding raw or custom eslint commands) to preserve and utilize the `.eslintcache`?
- [ ] **Language Parity**: Before editing any file, have I verified its primary language and written exclusively in that language? (English file → English edits.)

## 📊 Diagnostic Tools & Reference

All validation, testing, and multi-server setup scripts (`validate:*`, `audit:*`, `supabase:manage`) have been consolidated. Refer to [validation_manual.md](./references/qa/validation_manual.md) for the complete command reference table.

