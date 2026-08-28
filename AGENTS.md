# AGENTS.md - GLOBAL PROJECT RULES & IDENTITY

This file defines the immutable DNA of the Poké Vicio project. Every AI agent interacting with this repository MUST adhere to these rules.

Poké Vicio is a hybrid retro-modern web video game built with Vue 3, Pinia, GSAP, and Pokémon Showdown engine (`@pkmn/sim`) logic.

## Environment & Core Commands

- **Package Manager**: `npm`
- **Runtime Environment**: Node.js >=26 with `--permission` model (`--allow-fs-read=*` for maintenance scripts).
- **All-in-One Workspace Setup & Environment Update**:
  - **Windows (PowerShell as Admin / Terminal)**: `PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1`
  - **Linux / macOS (Terminal)**: `chmod +x ./setup-linux.sh && ./setup-linux.sh`
  *(Single-command SSoT to configure NVM, align Node.js runtime to `package.json`, update npm, apply security configs, clean cache, and install dependencies via `npm ci`. Always recommend restarting the IDE/terminal afterwards so the updated PATH is inherited without manual injections).*
- **Core Quality & Verification Commands**:
  - **Fast In-Development Check**: `npm run lint` (fast ~3-5s check using cached ESLint, `vue-tsc` type-check, domain types, and markdownlint for rapid developer iteration).
  - **Full Automated Test Suite**: `npm run test` (executes 100% of both `unit` (Vue/JSDOM) and `node` test projects natively via `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run` across Windows PowerShell/CMD and POSIX; strictly reserved for verifying source code logic changes in `src/` or `database/`; running test suites for documentation, DOX indices, markdown, or skill files is STRICTLY FORBIDDEN).
  - **Pre-Commit Single Source of Truth**: `npm run audit:warnings-diff` (automatically runs ESLint, `vue-tsc`, Fallow Dupes/Security, domain/FSM/database validation, and project rules against `origin/main` in one single pass; requires 0 errors and 0 new warnings).
  - **Global Unified Audit Engine**: `npm run audit` (emits structured JSON for AI; use `npm run audit:human` for visual console).
  - **Database Validation**: `npm run validate:sql`

## 0. Senior Developer Mindset & Laziness Ladder

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written. Before writing any code, stop at the first rung:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library already do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything explicitly requested.

- **Zero Error Suppression Mandate**: Never hide, mask, truncate, or swallow errors using ad-hoc crops, silent mock fallbacks, or empty catch blocks. When data, geometry, or assets violate constraints, the system MUST fail loudly with descriptive errors so they can be fixed at the source.
- **Zero Runtime Database Fallback Mandate**: All schema updates, missing property backfills, and structural evolutions MUST be executed strictly and exclusively via static SQL migrations. Runtime data patching, dynamic property synthesis (such as legacy `normalizeData`), or schema fallbacks (`fallback()`) in application code are strictly forbidden. If legacy runtime fallback code is discovered anywhere in the codebase, the agent MUST immediately alert the user for prompt refactoring.
- **Mandatory 3-Tier Bug Fixing Protocol Mandate**: Whenever investigating, fixing, or refactoring ANY bug across the codebase, agents MUST follow the 3-tier protocol:
  1. **Tier 1 (Isolated Unit Test - RED-to-GREEN)**: Create an isolated, self-contained unit test in `tests/node/` or `tests/unit/` reproducing the exact failure deterministically in RED before editing `src/`. Verify GREEN once fixed.
  2. **Tier 2 (Integrity & Integration Test)**: Verify cross-boundary data integrity, schema validation, FSM state machine transitions, DBRouter persistence roundtrips, and `@pkmn/sim` parity in `tests/integration/` or `tests/node/`.
  3. **Tier 3 (Playwright E2E Simulation)**: For UI, battle, or feature flows, verify or create Playwright E2E simulation cases adhering strictly to `/game-simulation` protocols (passive joystick, 100% ID-based locators, 5s per-action timeout limit, zero artificial timers, and certified combat replay).

## 1. Efficient Thinking & Communication

- **Internal Reasoning**: Use English for internal reasoning, code planning, and technical analysis.
- **User Interaction & Proposals**: All direct chat communications and temporary review proposals MUST be written in Spanish. Any proposed code changes, rule additions, or file diffs within proposals MUST be in English.
- **File & Code Editing**: All files inside the repository (code, skills, technical manuals, `.md` files) MUST be written strictly in English.

## 2. Core Identity: Hybrid Retro-Modern

- **Visual Shell**: Modern UI shell (gradients, relief borders) + Pixel Art heart (pixelated fonts and game sprites).
- **GSAP Exclusive Mandate**: All UI and battle animations MUST be implemented using GSAP. Manual CSS keyframes or timers for animation flow are strictly forbidden.
- **500/1000-Line Limit**: Files exceeding 500 lines should trigger warnings to modularize. Hard limit at 1000 lines (excluding static databases).

## 3. Mandatory Skill Invocation (Progressive Disclosure)

Upon starting work, every agent MUST load these core skills:

- `@/project-standards` (`.agents/skills/project-standards/SKILL.md`) for core architecture governance and navigation hub.
- `@/ponytail` (`.agents/skills/ponytail/SKILL.md`) for senior developer efficiency and minimal working code.
- `@/dox-navigator` (`.agents/skills/dox-navigator/SKILL.md`) for directory navigation and DOX hierarchy.
- `@/domain-type-first` (`.agents/skills/domain-type-first/SKILL.md`) for domain-type-first governance, data contracts, and union derivation.

*Domain-specific skills (`@/game-simulation`, `@/project-browser-testing`, `@/systematic-debugging`, `@/safe-commit`, `@/fallow`) MUST be loaded on-demand when performing their respective tasks.*

## 4. Specialized Project Rules Index

For topic-specific mandates, consult the specialized rule modules under [.agents/skills/project-standards/references/rules/](.agents/skills/project-standards/references/rules/README.md):

- [TypeScript Conventions & Data Integrity](.agents/skills/project-standards/references/rules/typescript_conventions.md): Domain-Type-First governance, zero-any/ignore, typed JSON wrappers, Node 26+ permissions, cross-platform paths.
- [Testing & Simulations](.agents/skills/project-standards/references/rules/testing_and_simulations.md): 3-Tier bug fixing protocol (Unit RED-to-GREEN, Integrity/Integration, Playwright simulations via /game-simulation), CLI debugging, Playwright `#id` locators, fail-fast turn execution, zero-timer simulation sync, 100% shared battle runners.
- [Database & Persistence](.agents/skills/project-standards/references/rules/database_and_persistence.md): DBRouter context isolation, Save Shield (no 0-Pokémon saves), prohibition on remote DB updates, UID parity.
- [Git & Workflow Safety](.agents/skills/project-standards/references/rules/git_and_workflow_safety.md): Destructive Git confirmations, uncommitted file backups, scratch directory mandate, main branch push protection.
- [Game Engine & State](.agents/skills/project-standards/references/rules/game_engine_and_state.md): Showdown canonical reference (`ACTIVE_GENERATION`), 4-seat compatibility, zero-cloning Pokémon instances, Showdown ID format.

## 5. DOX Directory Navigation Index

- [database/AGENTS.md](./database/AGENTS.md): Local/offline database schemas, seeds, and SQL migration logic.
- [scripts/AGENTS.md](./scripts/AGENTS.md): Automation, build processes, diagnostic tools, and utility scripts.
- [src/components/AGENTS.md](./src/components/AGENTS.md): Reusable visual UI components, styling compliance, and Retro-Modern aesthetics.
- [src/composables/AGENTS.md](./src/composables/AGENTS.md): Reusable composition state logic and lifecycle helpers.
- [src/data/AGENTS.md](./src/data/AGENTS.md): Static game databases, data configurations, and asset catalogs.
- [src/directives/AGENTS.md](./src/directives/AGENTS.md): Custom Vue directives.
- [src/logic/AGENTS.md](./src/logic/AGENTS.md): Core battle engine mechanics, math formulas, translations, and DBRouter boundaries.
- [src/router/AGENTS.md](./src/router/AGENTS.md): Application router and navigation guards.
- [src/stores/AGENTS.md](./src/stores/AGENTS.md): Pinia state management, state validation, and serialization prevention rules.
- [src/styles/AGENTS.md](./src/styles/AGENTS.md): UI styling tokens, SASS mixins, and views styling rules.
- [src/types/AGENTS.md](./src/types/AGENTS.md): TypeScript global contracts and types definitions.
- [src/views/AGENTS.md](./src/views/AGENTS.md): Top-level page views layout, routing entry points, and view-level orchestration.
- [supabase/AGENTS.md](./supabase/AGENTS.md): Online cloud persistence, migration versioning, and row-level security.
- [tests/AGENTS.md](./tests/AGENTS.md): Automated unit, integration, and E2E browser tests suites.
- [external/](./external/): External reference codebases (read-only, excluded from all linting/build/audit/fallow).
  - [external/pokemon-showdown-code/](./external/pokemon-showdown-code/): Source code of Pokémon Showdown used as reference and source of truth.
  - [external/pokemon-showdown-ai/](./external/pokemon-showdown-ai/): Reference AI implementation from <https://github.com/fr33lo/pokemon-showdown-ai>.
