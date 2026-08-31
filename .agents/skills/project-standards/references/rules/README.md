# Agent Rule Modules (Project Standards)

This directory contains the 5 **invariable architectural rule modules** for AI agents and developers working on Poké Vicio. These rules supplement the primary `project-standards/SKILL.md` governance and root `AGENTS.md`, organized by topic following progressive disclosure principles.

> 📘 **Master References Hub**: For deep-dive technical manuals, formulas, combat engine internals, and feature guides, consult the [Project Standards Navigation Hub](../../SKILL.md).

## Modules Index & Boundaries

| Module | Exact Scope & Authority | What Belongs Elsewhere |
| :--- | :--- | :--- |
| [TypeScript Conventions](./typescript_conventions.md) | Domain-Type-First governance, zero-any/ignore, typed JSON wrappers, Zero-Hiding security mandate, Fallow health score (85/100), Node.js 26+ modernization. | For DB schemas/Valibot ➔ [`database_and_persistence.md`](./database_and_persistence.md). For type design principles ➔ [@/domain-type-first](../../../domain-type-first/SKILL.md). |
| [Testing & Simulations](./testing_and_simulations.md) | CLI-first debugging, Playwright E2E simulation rules, passive joystick law, 5s timeout limit, mandatory `#id` locators, 100% shared battle runners. | For browser manual QA steps ➔ [`../qa/browser_testing_manual.md`](../qa/browser_testing_manual.md). For battle state machine ➔ [`../battle/battle_mechanics_manual.md`](../battle/battle_mechanics_manual.md). |
| [Database & Persistence](./database_and_persistence.md) | DBRouter online/offline isolation, Save Shield (0-Pokémon protection), remote DB modification prohibitions, static SQL migrations. | For DBRouter proxy architecture ➔ [`../technical/dbrouter_manual.md`](../technical/dbrouter_manual.md). For save serialization ➔ [`../technical/save_system_manual.md`](../technical/save_system_manual.md). |
| [Git & Workflow Safety](./git_and_workflow_safety.md) | Confirmation for destructive Git operations, uncommitted file backups in `scratch/`, prohibition on autonomous commits, root setup scripts SSoT (`setup-windows.ps1`/`setup-linux.sh`). | For Safe Commit pipeline ➔ [@/safe-commit](../../../safe-commit/SKILL.md). For dependency hygiene ➔ [`../technical/dependency_management_manual.md`](../technical/dependency_management_manual.md). |
| [Game Engine & State](./game_engine_and_state.md) | High-level engine invariants ONLY: Showdown worker delegation (`ACTIVE_GENERATION`), 4-seat generic compatibility, zero-cloning Pokémon instances, Showdown ID formatting, illegal Pokémon quarantine. | 🛑 **NEVER put gameplay subsystem rules here!** For Daycare/Breeding/Eggs ➔ [`../systems/breeding_manual.md`](../systems/breeding_manual.md). For Gyms ➔ [`../systems/gym_system_manual.md`](../systems/gym_system_manual.md). For Items ➔ [`../systems/item_system_manual.md`](../systems/item_system_manual.md). For Battle Mechanics ➔ [`../battle/battle_mechanics_manual.md`](../battle/battle_mechanics_manual.md). For Math Formulas ➔ [`../core/game_formulas_manual.md`](../core/game_formulas_manual.md). |

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
