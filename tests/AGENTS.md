# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- **Event-Driven Simulation Sync & Deterministic Timeouts**: Simulations act STRICTLY as a passive joystick that reacts ONLY to typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`) emitted after genuine FSM/UI transitions. It is STRICTLY FORBIDDEN to use manual timers (`setTimeout`, `page.waitForTimeout`), `page.waitForFunction`, store/FSM/DOM polling, inflate action timeouts beyond 5s (`MAX_PER_ACTION_TIMEOUT_MS = 5000`), or invent ad-hoc property heuristics (such as checking `hp === 0`). Suite-level total timeouts are configured by parameter via `getSuiteTimeoutForBatch(turnCount)`, scaling with fuzzer turn volume (`turnCount * MAX_PER_ACTION_TIMEOUT_MS`) when turn history is present, and defaulting to `MAX_SUITE_TOTAL_TIMEOUT_MS = 180000` (3 minutes statically) when no turn history exists.
- **Absolute Prohibition on Artificial Timers & GSAP Clock Standard**: Application delays and transition pauses MUST be driven by `gsapSleep` (from `@/logic/utils/gsapHelpers`) or GSAP timelines. This enables Playwright and headless simulations to execute with instant time-scaling (`gsap.globalTimeline.timeScale(...)`) without artificial sleeps.
- **Fail-Fast Turn Execution Mandate**: In any E2E or Playwright simulation, a single turn failure, desync, or timeout MUST immediately terminate execution with a descriptive error. Retries, silent skips, and spin-loops are strictly forbidden.
- **Mandatory Inheritance & Polymorphism (BaseBattleSimulation)**: All battle simulations must inherit from `BaseBattleSimulation` that manages the execution loop, leaving subclasses to implement only their specific specializations. Duplicating turn execution loops is strictly prohibited.
- **Simulation Code Simplicity & Base Class Inheritance**: Battle and search simulation wrappers (e.g. `SearchLoopSimWrapper`) MUST inherit time scaling and turn execution directly from `BaseBattleSimulation` and standard helpers (`executeNativeAutoBattle`). Implementing custom `while(true)` loops, manual `page.evaluate` store polling, or redundant `speedUpAnimations(100)` calls is strictly prohibited under the Ponytail and Clean-Code governance.
- **Strict UID-Based Switch Selection**: In `base_battle_simulation.ts`, both voluntary and forced switch actions strictly resolve target Pokémon via canonical `uid` (`data-pokemon-uid="${targetUid}"`), prohibiting slot-guessing and text matching.
- **Showdown UID Mapping Parity**: All test assertions, element selectors, and mock verifications MUST use canonical Showdown UID mappings (`showdownUidMapper.ts`) and UID-based data attributes (`data-pokemon-uid="${uid}"`, `data-item-id="${id}"`). Text-based matching or slot index guessing is strictly prohibited.
- **Mandatory 3-Tier Bug Fixing Protocol (Unit, Integrity & Playwright Simulation)**: Whenever fixing or refactoring ANY bug across the codebase, the fix MUST follow the 3-tier protocol:
  1. **Tier 1 (Unit Test - RED-to-GREEN)**: Create an isolated, static reproduction test in `tests/node/` or `tests/unit/` that reproduces the exact failure in RED before modifying `src/`. Verify GREEN once repaired.
  2. **Tier 2 (Integrity / Integration Test)**: Verify cross-module data contracts, schema validations, FSM state machine transitions, store persistence roundtrips, and `@pkmn/sim` parity in `tests/integration/` or `tests/node/`.
  3. **Tier 3 (Playwright E2E Simulation)**: For UI, battle, or feature flows, verify or create Playwright E2E simulation cases adhering strictly to `/game-simulation` protocols (passive joystick, 100% ID-based locators, 5s per-action timeout limit, zero artificial timers, and certified combat replay).
- **Exact Fainted State Synchronization Across Bench and Field Combatants**: All unit, integration, and E2E battle tests MUST verify exact fainted state synchronization (`0 fnt`, `hp <= 0`, `reviving: true`) across both active field combatants and bench party members. Tests must assert that faint transitions (`processFaint`) run to completion before switch menus or replacement choices are evaluated.
- **Playwright Concurrency Mandate**: Playwright test executions and simulations MUST run using Playwright's default concurrency settings. Forcing serial mode (`test.describe.configure({ mode: 'serial' })`) is strictly forbidden.
- **Playwright Browser Store Access**: Never use dynamic imports (`import('@/stores/game')`) inside `page.evaluate` or `page.waitForFunction`. Always use canonical store resolvers on `window`, such as `window.__VITE_DEBUG__.getGameStore()`.
- **Zero Runtime Fallback Policy**: Test utilities, mocks, and replayers MUST NOT introduce fallback choices, default return objects, or swallow errors (`.catch(() => true)`). Missing test properties or unexpected state divergence must fail loudly and immediately with descriptive errors.
- **TypeScript Strict Mocking (Zero Any / Zero Unknown Casts)**: When testing components, schemas, or systems, all mock structures must be fully typed and conformant to their canonical schemas (e.g. `BattleState`, `SaveDataDto`). Never use `any`, `as unknown as`, or artificial type casts to bypass type safety. Declare complete test objects or local typed helpers.
- **Event Stream Parity Testing Mandate (Zero Visual Regressions)**: FSM transition validation and engine replays alone do not prove UI animation execution. All combat lifecycle routines (trainer intros, manual switches, forced switches, and full-team 6v6 faint chains) MUST be covered by unit tests (such as `battle_animation_sequence_parity.spec.ts`) that record an chronological Event Stream asserting:
  1. Exact order of FSM states.
  2. Sequential execution of `handleWithdrawRequest` and `handleReleaseRequest` hooks.
  3. Exact presence of localized chat log announcements.
  4. Precise matching of active combatant UIDs and visual sprite representations without ghost entities or missing frames.
- **Map & Gym Atmosphere Lifecycle Testing Mandate**: Automated tests (`gym_weather_isolation.spec.ts`, `gym_atmosphere_lifecycle_integration.spec.ts`) MUST assert that single-sprite arenas (gyms) remain isolated from natural time/weather shifts by default, accept configurable overrides (`fixedCycle`/`fixedWeather`), while multi-sprite locations dynamically reflect their supported day phases.
- **Resource Lifecycle in Test Factory Functions**: Helper factory functions that construct and return disposable resources to callers (such as `createMigratedDatabase(): DatabaseSync`) MUST NOT use `using db = ...` inside the factory body. Using `using` inside the factory disposes the instance upon returning from the function scope, resulting in `database is not open` errors for callers. The caller scope alone is responsible for managing the disposal lifecycle via `using db = createMigratedDatabase()`.
- All test suites run under **Vitest** (vite-node) via `vitest.workspace.ts`. Regression checks MUST ALWAYS run the full test suite (`npm run test`), never subset commands like `test:unit` or `test:node` alone.

## Work Guidance

- **Save & Reload State Roundtrip Verification**: Any store feature modifying player profile, class, or progression MUST include a full roundtrip unit test simulating the entire client lifecycle: store action -> state serialization (`serializeState`) -> schema validation (`validateAndSanitize`) -> fresh Pinia store rehydration (`updateState`) to guarantee zero persistence loss on browser refresh.
- **Immutable Backup Fixtures for Migration & Serialization Tests**: Automated test suites verifying SQL migrations, Dex compatibility, or player save serialization (`backup_saves_serialization.spec.ts`, `backup_full_validation.test.ts`) MUST exclusively load deterministic fixtures from `tests/node/fixtures/server_franco_backup_fixture.json`. Tests must NEVER load dynamic, live, or timestamped database backups from `database/backups/`, as production database snapshots evolve over time and cause test flakiness or inconsistent schema states.
- **Exhaustive Spawn Whitelist Unit Tests**: All map encounter generators (`getFinalGroundRates`) and static map databases (`FIRE_RED_MAPS`) MUST be verified against `ENABLED_POKEMON_IDS` across all day phases (`morning`, `day`, `dusk`, `night`) and all weather conditions in `tests/unit/world/spawn_integrity.spec.ts`.
- **3-Tier Bug Resolution Protocol Execution**: Whenever a bug is presented with a reproducing example or discovered during test runs:
  1. Extract failing data and construct a static, inlined Unit Test in `tests/node/` or `tests/unit/` to verify RED failure.
  2. Implement/update Integrity/Integration tests in `tests/integration/` or `tests/node/` to ensure contract consistency across boundaries.
  3. Verify/implement Playwright E2E browser simulations adhering strictly to `/game-simulation` rules.
  4. Fix root cause in `src/` (zero fallbacks) and confirm all 3 test tiers pass cleanly in GREEN.
- **Runner**: All tests use Vitest. `tests/node/` runs with `environment: 'node'`; `tests/unit/` and `tests/integration/` run with `environment: 'jsdom'`. To validate all changes across the codebase, ALWAYS execute `npm run test`.
- **Imports**: Use `import { describe, it, vi, beforeAll, beforeEach } from 'vitest'`. Do NOT import from `node:test`.
- **@/ aliases**: Fully supported in both environments. No workarounds needed.
- **Mocks**: Use `vi.fn()`, `vi.spyOn()`, `vi.stubGlobal()`. Never use `node:test`'s `mock` object.
- Playwright is preferred for E2E browser testing.
- When dynamic store mocks are needed, declare local mock interfaces instead of using `as any`.
- Update test cases immediately when source function signatures change.
- **Node.js Web Worker Imports**: When importing Web Worker files (like `showdown.worker.ts`) inside node environment tests (`tests/node/`), mock global variables like `self` using `vi.stubGlobal('self', { onmessage: null, postMessage: () => {} })` inside a `beforeAll` hook and load the worker dynamically using `await import()`.
- **Array Indexing and Type Narrowing in Tests**: To satisfy strict type checking under `noUncheckedIndexedAccess` without using `any` or bypassing rules, avoid referencing array elements directly (e.g. `arr[0]`). Extract them to local variables and perform explicit existence assertions or throw errors if undefined to narrow their types.
- **Dynamic Store Loading**: In node environment tests, avoid static imports of Vue/Pinia store modules. Use dynamic imports protected by `typeof window !== 'undefined'` checks or mock them via `vi.mock()`.
- **Extension-First Imports**: Internal imports in `tests/node/` tests may include the `.ts` extension — vite-node handles it transparently.
- **Mandatory Audit Pipeline**: Running `npm run audit` is mandatory before any commit. It runs: ① `test:node`, ② `audit` (SASS, GPU, Node 26+), ③ `validate:fsm` (parity), ④ `validate:items/abilities/moves`, and ⑤ `validate:sql`. **`--allow-addons` is required** in the `audit` launch flags because Vitest 3+ uses Rolldown, which loads a platform-specific native addon (`rolldown-binding.*.node`). Without it, child processes spawned under the `--permission` model receive `ERR_DLOPEN_DISABLED` and Vitest fails to start. **`audit_full.ts` Runner Constraint**: The `Node.js Tests` task in `audit_full.ts` MUST invoke Vitest via `npm run test:node` (with `shell: true`). Never use `npx vitest` directly — `npx` may download a fresh Vitest copy without the platform-specific Rolldown native bindings (npm optional dependency bug), causing startup failures.
- **CLI-Ready Visuals**: Battle animations must be triggerable via the debug bridge (e.g. `window.__VITE_DEBUG__.battle.animations.awaitTween('attack-player')`) for headless CLI verification.
- **Vitest Module Isolation per Worker**: Each spec file runs in its own Vitest worker process with a fresh module registry. Module-level mutable state is automatically isolated between specs.
- **Mock HP Safety**: Mock pokemon instances used in unit/integration tests that trigger stat recalculation (`recalcPokemonStats`) MUST have their current `hp` set to a low value (e.g., `5` or `10`) to guarantee it never exceeds the newly calculated `maxHp`.
- **NPC AI Choice Testing (Math.random Mocking)**: Since default NPC AI configurations have a 50% random error rate (`errorRate: 0.50`), unit and integration tests that verify specific AI move choices must mock or spy on `Math.random` (`vi.spyOn(Math, 'random')`) to ensure deterministic evaluation.
- **GSAP Timer Mocking & Teardown in Vitest**: When mocking `gsap.delayedCall` in `tests/vitest.setup.ts`, always call `timerId.unref()` on the created `setTimeout` handles and track active timers in a set cleared in `afterEach`.
- **Node 26 WebStorage Fork Flag**: Under Node.js 26+, child worker processes spawned via Vitest fork pools should include `execArgv: ['--no-experimental-webstorage']` in `vitest.config.ts`.
- **Streamed Simulation Runner Output Mandate**: Long-running sequential simulation drivers MUST use asynchronous `spawn` with real-time `stdout`/`stderr` chunk piping instead of blocking `execSync` buffering.
- **Emoji-First Log Formatting**: All simulation and worker logs MUST start strictly with the action emoji at column 0 (`▶️`, `✅`, `❌`, `✨`, `🚀`, `⚠️`, `⏭️`) followed by `[TAG] [PROGRESS%] (CURRENT/TOTAL) Message`.

## Verification

- Run `npm run test` or `npm run audit` to verify test suite health.

## Reference Manuals

- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Script suite reference commands.
- [browser_testing_manual.md](../.agents/skills/project-standards/references/qa/browser_testing_manual.md): Playwright and debug bridge verification flows.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Domain module documentation for helpers.
- [integration/](./integration/AGENTS.md): Domain module documentation for integration.
- [node/](./node/AGENTS.md): Domain module documentation for node.
- [unit/](./unit/AGENTS.md): Domain module documentation for unit.
