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
  - **Global Unified Audit Engine (Single Source of Truth)**: `npm run audit` (the primary project quality gatekeeper; displays consolidated Box-Drawing tables in console, writes structured JSON to `scratch/audits/latest_audit.json`, and MUST report 0 errors).
  - **Safe-Commit Diff Comparator**: `npm run audit:for-commit` (STRICTLY RESERVED for the safe-commit workflow to diff new warnings vs `origin/main`; using this command for general checks or documenting it in other DOX files is forbidden).
  - **NPM Script Single Source of Truth**: All developer tools, validators, fuzzer suites, and maintenance routines MUST be executed via official NPM scripts declared in `package.json`. Raw direct executions (`node scripts/...`, `npx tsx ...`) in skills or documentation are strictly forbidden. Arguments passed to npm scripts MUST use direct `key=value` parameters or clean flags without `--` (e.g., `npm run <script> param=value`, `npm run database:update server=server_franco`, `npm run audit fix`).

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
- **Mandatory O(1) Data Structure Optimization Mandate**: Agents MUST proactively seek, detect, and optimize data structures across static datasets, reactive Pinia stores, heuristic AI sets, and sprite catalogs to guarantee constant $O(1)$ time complexity. Linear searches (`.find()`, `.filter()`, `.includes()`) in execution hot paths are strictly prohibited when an $O(1)$ typed dictionary (`Record<DomainId, T>`, `ReadonlySet<DomainId>`, `Map<DomainId, T>`) can be derived.
- **Absolute Prohibition on O(1) Escape Hatch Bypasses Mandate**: It is STRICTLY FORBIDDEN to use domain escape hatches (such as `// domain-ok`, `// string-ok`, or `// ts-ignore`) to silence or bypass O(1) data structure performance audits (`validate_o1_data_structures.ts`). All linear searches on static arrays, catalogs, or constants in execution paths MUST be refactored cleanly to typed `ReadonlySet<T>`, `Record<DomainId, T>`, or `Map<K, V>`.
- **Absolute Prohibition on File-Level Audit Ignores Mandate**: It is STRICTLY FORBIDDEN to bypass or silence auditor, lint, security, or TypeScript checks using file-wide ignore directives (such as `// fallow-ignore-file`, `/* eslint-disable */`, or `@ts-nocheck`). Only localized, line-by-line Fallow annotations (`// fallow-ignore-next-line`, `// singleton-ok`, `// domain-ok`, `// no-magic`) are permitted in strictly justified edge cases. All issues MUST be resolved cleanly at the code level.
- **Absolute Prohibition on Build Bypasses Mandate**: It is STRICTLY FORBIDDEN to replace `npm run build` with `npx vite build`, `vite build`, or any isolated partial commands to evade failures in pre-build audits or type checks. All build verifications MUST execute `npm run build` as declared in `package.json` and return exit code 0. If any step inside `npm run build` fails, execution MUST stop and all underlying errors must be resolved cleanly.
- **Mandatory GSAP Migration over Deletion Mandate (Never Delete, Always Migrate)**: Whenever any auditor (`validate_component_styles.ts`, `audit_project.ts`, Fallow, or style linters) flags manual CSS transitions (`transition: ...`) or `@keyframes` violating the GSAP mandate, agents **MUST NEVER** simply delete or strip the animation rules to silence the warning, leaving UI elements static and lifeless. Agents **MUST ACTIVELY MIGRATE** the animation to GSAP (`v-gsap-hover`, `useGsapTransition`, `gsap.to()`, `gsap.from()`, `gsap.timeline()`, Vue `<Transition :css="false" @enter="..." @leave="...">`, or GSAP composables) preserving 1:1 visual motion, easing, duration, and user delight. Auditor warnings highlight non-compliant *technology choices* (e.g. CSS keyframes), NEVER an instruction to remove the visual feature itself. The mandatory goal of audit remediation is architectural evolution with 100% visual parity.
- **Mandatory Proactive Dead Code & Legacy File Deletion Mandate**: When Fallow, linters, or codebase intelligence tools report unused exports, orphan components, or unreachable files, agents **MUST NEVER** sweep them under the rug using blanket entry globs (such as `"src/components/**/*.vue"` or `"src/views/**/*.vue"` in `.fallowrc.json`). Agents MUST perform a case-by-case root cause investigation:
  1. If the file is legitimate active multithreaded logic (Web Workers, OffscreenCanvas renderers) or dynamically routed entry points, ensure it is properly referenced or documented.
  2. If the file is an active component that was simply omitted from the view tree, connect and mount it in its proper parent view.
  3. If the investigation confirms the code or file is **GENUINELY DEAD CODE** (e.g., deprecated legacy prototypes, abandoned test components, or files superseded by newer replacements), agents **MUST PROACTIVELY DELETE THE OBSOLETE FILES**, clean up any empty parent directories, and update relevant DOX (`AGENTS.md`) indices.

## 1. Efficient Thinking & Communication

- **Internal Reasoning**: Use English for internal reasoning, code planning, and technical analysis.
- **User Interaction & Proposals**: All direct chat communications and temporary review proposals MUST be written in Spanish. Any proposed code changes, rule additions, or file diffs within proposals MUST be in English.
- **File & Code Editing**: All files inside the repository (code, skills, technical manuals, `.md` files) MUST be written strictly in English.

## 2. Core Identity: Hybrid Retro-Modern

- **Visual Shell**: Modern UI shell (gradients, relief borders) + Pixel Art heart (pixelated fonts and game sprites).
- **GSAP Exclusive Mandate**: All UI and battle animations MUST be implemented using GSAP. Manual CSS keyframes or timers for animation flow are strictly forbidden. When removing non-compliant CSS transitions/keyframes, they MUST be migrated to GSAP equivalents (`v-gsap-hover`, `useGsapTransition`, GSAP timelines), never deleted without replacement.
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

*(Note: Specific gameplay systems such as Daycare/Breeding, Gyms, Obedience, Items, War, and Spawns are governed strictly in their dedicated manuals under [references/systems/](.agents/skills/project-standards/references/systems/)).*

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
