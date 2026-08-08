# Agent Rule Modules (Project Standards)

This directory contains modular reference guidelines for AI agents and developers working on Poké Vicio. These rules supplement the primary `project-standards/SKILL.md` governance and root `AGENTS.md`, organized by topic following progressive disclosure principles.

## Modules Index

| Module | Description & Scope |
| :--- | :--- |
| [TypeScript Conventions](./typescript_conventions.md) | Domain-Type-First governance, zero-any/ignore, typed JSON wrappers, Zero-Hiding security mandate, Fallow health score (85/100), Node.js 26+ modernization, cross-platform path standard. |
| [Testing & Simulations](./testing_and_simulations.md) | CLI-first debugging, Playwright E2E simulation rules, fail-fast turn execution, zero-timer simulation sync, mandatory `#id` locators, 100% shared battle runners, logging standards (`console.debug`), holistic diagnosis protocol. |
| [Database & Persistence](./database_and_persistence.md) | DBRouter isolation, Save Shield (0-Pokémon protection), remote DB modification prohibitions, UID-based simulator parity, status representations (`''` vs `null`). |
| [Git & Workflow Safety](./git_and_workflow_safety.md) | Confirmation for destructive Git operations, uncommitted file backup requirements in `scratch/`, prohibition on autonomous commits, root setup scripts SSoT (`setup-windows.ps1`/`setup-linux.sh`), artifact governance. |
| [Game Engine & State](./game_engine_and_state.md) | Showdown canonical source of truth (`ACTIVE_GENERATION`), 4-seat generic compatibility, zero-cloning Pokémon instances, Showdown ID formatting, GBA font capitalization ('ñ'), SASS integrity, GPU efficiency. |

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
