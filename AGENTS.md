# AGENTS.md - GLOBAL PROJECT RULES & IDENTITY

This file defines the immutable DNA of the Poké Vicio project. Every AI agent interacting with this repository MUST adhere to these rules.

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library already do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size — lazy means less code, not the flimsier algorithm.

Not lazy about: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything explicitly requested. Whenever a bug is presented with a reproducing example, you MUST FIRST create a unit test (or other appropriate test setup) that successfully reproduces the bug (verifying it fails) before implementing the fix. This guarantees regression protection. Non-trivial logic leaves ONE runnable check behind — the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

## 0. Efficient Thinking & Communication

- **Internal Reasoning**: The agent should use the most efficient language for its internal processing (preferably English) when reasoning, planning, or analyzing code.
- **User Interaction & Review Artifacts**: All direct communication via chat with the user (responses, explanations, questions) as well as temporary review artifacts/proposals (like `learning_proposal.md`) MUST be written in Spanish. However, any proposed code changes, rule additions, or file diffs within those proposals MUST be written in English.
- **File & Documentation Editing**: When modifying any repository files (such as code files, skill files, technical manuals, `.md` files, or any documentation inside `.agents/`), the agent MUST explicitly verify the target file's primary language first. If the file is written in English, any changes or additions to that file MUST also be written in English. Do not mix languages within a single file.
- **Clarification & Resolution (Zero-Waste Policy)**: Whenever there are any doubts, ambiguities, or unclear requirements regarding a task, the agent MUST trigger the `/grill-me` slash command (or use the skill `/@brinstorming` if its not available) to interview the user and resolve all issues before any implementation. Writing code based on assumptions, which leads to wasting tokens and developer time, is strictly prohibited.

## 1. Mandatory Skill Invocation

- Always load and follow the instructions in the `@/project-standards` skill.
- This skill is NOT a checklist; it is the foundation of every reasoning and implementation step.

## 2. Core Identity: Hybrid Retro-Modern

- **Modern UI Shell**: Premium gradients, relief effects, shining borders, fluid transitions.
- **Pixel Art Heart**: All game content, sprites, and typography MUST be pixelated (using 'Pokemon FireRed LeafGreen' as the primary font, except in technical logs, debugger tools, console error modals, or special cases where special characters like '@' are required; in such cases, standard monospaced/smooth fonts or alternative pixel fonts like 'VT323'/'Silkscreen' are allowed).
- **SASS Integrity**: SASS function capitalization is handled **automatically** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build. Therefore, developers and agents can write standard lowercase CSS filters/transforms, and Vite will automatically format and capitalize them. No manual capitalization is required.
- **GPU Efficiency**: Strict use of Texture Atlases and Object Pooling.
- **Game Performance First**: This is a high-fidelity web video game. All UI and logic implementations MUST prioritize GPU-accelerated rendering and FPS stability. Optimize workflows and filter chains (e.g., `pokemon-outline-performance`) to ensure maximum fluidity without compromising visual quality.
- **GSAP Exclusive Mandate**: All animations in the project (UI transitions, battle effects, map movements, etc.) MUST be implemented using GSAP. The use of manual CSS `@keyframes`, transitions, or `setTimeout`/`setInterval` for animation flow is STRICTLY FORBIDDEN. For ANY task involving the battle engine or FSM transitions, you MUST use `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts` to ensure 1:1 parity with documentation and zero race conditions.
- **Zero-Timer & Zero-Variable Policy**: It is STRICTLY FORBIDDEN to use `setTimeout`, `setInterval`, or any numeric timer to wait for an animation to finish. Coordination of sequential animations MUST NOT be handled using reactive state variables (boolean flags like `isAnimating` or `stepIndex`). Always use GSAP's native deterministic orchestration: `.then()` promises, `await` on timelines, or `onComplete` callbacks. This ensures that logic remains synchronized even if animation durations are adjusted in the future.
- **GBA Font Spanish Capitalization Constraint**: The primary font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (e.g., replacing 'Ñ' with 'ñ') to ensure they render correctly.

## 3. Database Isolation & Persistence Safety

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.
- **Zero-Pokemon Save Prohibition (Save Shield)**: To prevent data corruption or accidental reset overlays, it is STRICTLY FORBIDDEN to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`. A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.
- **No Runtime Sanitization Patches / Compatibility Adapters**: It is strictly forbidden to implement runtime compatibility patches, sanitizers, normalizations, or adapters in application code (e.g. inside components, save loading, initialization hooks, or lookup helpers like `getItemById`) to dynamically bridge or fix mismatched/incorrect identifiers. IDs (such as item, move, and Pokémon IDs) are strictly constant, final, and immutable; they MUST never be translated, normalized, or patched at runtime. Using string manipulation functions (such as `.toLowerCase()`, `.replace(/[^a-z0-9]/g, '')`, or regex sanitizers) to dynamically bypass or "clean up" incorrect IDs is strictly prohibited. If a lookup or matching fails, it MUST fail with an explicit error to signal that the source identifier or database save is wrong and must be corrected directly at the source (creating/running database migrations if the data is persisted).
- **Absolute Prohibition on Database Updates**: It is STRICTLY FORBIDDEN for any AI agent to execute, run, or trigger the database update/migration scripts (e.g., `npm run servers:db:update` or similar) against any remote, Docker-based, or shared database profile (including `server_franco`, `cloud`, or `official_prod`). Agents must NEVER touch or update these databases; database updates are strictly reserved for manual execution by the USER.

## 4. Code Modularity (500/1000 Rule)

- **Recommended Limit**: Files exceeding **500 lines** should trigger warnings and recommendations to modularize.
- **Hard Limit**: No logic or UI component may exceed **1000 lines**. Exceeding this limit is considered a critical technical debt error.
  - _Exception_: Massive databases, metadata modules, and files in `src/data/` are exempt from this limit to preserve data integrity.

## 5. Architectural Reuse & Inheritance

- **Zero-Invention Policy**: Never create new "islands" of logic or styling if a generic system (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`) already exists.
- **Extend, Don't Duplicate**: Always prioritize parameterization and inheritance to adapt existing systems instead of starting from scratch.

## 6. CLI-First Debugging & Testing Integrity

- **Efficiency Over GUI**: When simulating game states or testing conditional UI (e.g., money, levels, map dominance), **ALWAYS** prioritize using the `window.__VITE_DEBUG__` console commands over manual GUI interaction.
- **Speed & Reliability**: CLI-based state simulation is faster and more reliable for automated tests and subagent tasks.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill.
- **Zero-Untested Goal Principle**: It is strictly forbidden to report a coverage or mass-testing goal as "Completed" if there is even one (1) move, ability, or item reported as `UNTESTED` in the final fuzzer output. The coverage must be numerically absolute (0 untested) to declare the goal fulfilled.
- **Infinite Punching Bag Pattern**: To prevent fuzzing battles from ending prematurely due to rapid Pokémon fainting, the testing framework should implement silent health maintenance (restoring HP above a threshold directly in the Showdown simulator instance), acting as an infinite punching bag.

## 7. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Zero-Any Policy**: The use of `any` is STRICTLY FORBIDDEN. Before resorting to it, you MUST analyze if new interfaces or data types should be defined to maintain strict type safety.
- **Verification Workflow**: For daily development, run `npm run lint` (which includes type-checking) to verify syntax and type safety. Running `npm run audit:full` is mandatory before any commit operation to ensure the repository remains unbroken. **CRITICAL**: Do NOT run heavy validation, linting, type-checking, or full audits for trivial, single-word, or single-character edits (such as swapping a boolean, fixing a typo, or updating comments) to avoid wasting time and system resources.
- **Node.js 26+ Modernization**: Use `Temporal` instead of `Date` for engine logic. Mandatory use of `node:` prefix for built-in imports. Mandatory use of the **Node.js 26 Permission Model** (`--permission`) for utility scripts with restricted FS access. Mandatory use of **Explicit Resource Management** (`using`) for file handles and database connections in Node scripts. Prefer **`node:test`** for pure logic unit tests (non-browser). Prefer **`node:timers/promises`** for delays in scripts. Run `npm run validate:sql` before database commits.
- **Cross-Platform Path Standard**: For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of expressions or replace statements. This ensures that the generated output files (like JSON catalogs) remain identical and valid in browser environments across Windows, Linux, and macOS.
- **Fallow Configuration Maintenance**: When refactoring files, changing directory structures, or renaming modules, you MUST update `.fallowrc.json` (especially `ignoreExports` paths) to reflect the new paths, preventing stale references and quality audit warnings.

## 8. Git Safety & Rollback Protocol

- **Mandatory Confirmation**: Before executing any git operation that involves a rollback, reset, or destructive change (e.g., `git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly ask the user for confirmation.
- **Explicit Command Disclosure**: The confirmation request MUST include the exact command(s) that are about to be executed so the user can review them.
- **Safety First**: Rollbacks are high-risk operations. Never assume the user wants a destructive revert without a clear, final "Yes" from their side.
- **Massive Script Execution on Uncommitted Files**: Before running any massive or bulk modification script (e.g., code formatters, batch replacements, refactoring utilities) on files that have uncommitted changes, the agent MUST either propose committing the current changes first, or make temporary backups of the targeted files inside the `scratch/` directory to ensure they can be recovered if something breaks.
- **Git Commit & Safe-Commit Prohibition**: It is STRICTLY FORBIDDEN to execute any commit or safe-commit flow autonomously without an explicit user instruction to commit or save the repository. The agent MUST NOT assume completion or initiate the git pipeline on its own.

## 9. Output Directory Integrity (Scratch Folder)

- **Scratch Directory Mandate**: Whenever generating temporary files, debug outputs, text reports, summaries, or any validation/audit reports (regardless of file extension: `.txt`, `.log`, `.json`, etc.) intended for inspection, review, or later study, they MUST be stored exclusively in the `scratch/` directory at the project root. Dumping these temporary reports or files in the project root, source directories, or any other arbitrary location is strictly prohibited to maintain repository cleanliness.

## 10. DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits
- **Relative Paths Mandate**: All links to other files and indices in all `AGENTS.md` files MUST use relative paths (e.g. `./database/AGENTS.md` or `../database/AGENTS.md`). Absolute paths (e.g., `file:///C:/...` or absolute file system URLs) are strictly forbidden to ensure portability across different development environments. If any absolute paths are found in any `AGENTS.md` files, they must be corrected to relative paths immediately.
- **Gitignored Paths in DOX Indices**: Directories or files that exist locally but are excluded via `.gitignore` (e.g. credential folders, generated local configs) MUST still be referenced in their parent's Child DOX Index if they represent a real domain boundary. Mark them with the suffix `_(gitignored — reason)_` so agents and reviewers understand why they are absent from the repo. The DOX audit engine skips existence checks for gitignored paths automatically, so these entries will never produce CI failures.

## 11. State Integrity & Reference Safety (Zero-Cloning Mandate)

- **Absolute Prohibition on Pokémon Object Cloning**: It is STRICTLY FORBIDDEN to clone, shallow-copy (`{ ... }`), or replace Pokémon instances representing active combatants or team members to trigger Vue reactivity updates. Doing so breaks object reference parity, creating desynchronized copies where changes to HP, status conditions, experience, or items are not propagated back to the team source of truth.
- **UID-Based Resolution**: When referencing combatants or passing team elements to components, always pass the unique identifier (`uid`) and resolve the object dynamically using getters from the primary source of truth (`gameStore.state.team` or `gameStore.state.box`).
- **In-Place Mutations**: If statistical or volatile properties of a Pokémon must be altered, mutate the object properties directly on its reference to maintain reactive bindings across all active views (bag, quick-switch, battle interface).

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

- **Spanish ID Prohibition (Strict English Mandate)**: It is strictly forbidden to create or use logical identifiers (`id`) for items, Pokémon, abilities, natures, moves, or other elements in Spanish. All IDs in databases, saves, and internal logic (including engine code and configurations) MUST be exclusively in English (using official Showdown format). Writing intermediate translation tables, patches, or adapters to preserve or support Spanish IDs in the backend/engine is strictly prohibited. If a developer or agent encounters any legacy Spanish IDs or translation patches already in the codebase, they MUST fix them immediately and migrate them to English Showdown IDs. Spanish is reserved exclusively for display and user-facing fields (such as descriptions or names shown in the UI).

## Child DOX Index

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
- [CONTEXT.md](./CONTEXT.md): Glossary and domain models for the repository.

---

_Note: If you are an AI agent and haven't loaded `@/project-standards` yet, do it now._
