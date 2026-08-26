# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- **RULE #1: Event-Driven Simulation Sync & Passive Joystick Law**: Simulations act STRICTLY as a passive joystick that reacts ONLY to typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`) emitted after genuine FSM/UI transitions. It is STRICTLY FORBIDDEN to use manual timers (`setTimeout`, `page.waitForTimeout`), `page.waitForFunction`, store/FSM/DOM polling, inflate action timeouts beyond 5s, or invent ad-hoc property heuristics (such as checking `hp === 0`). Synchronization MUST be strictly event-driven:
  - **Database & Disk Sync**: Wait for specific network responses (e.g. intercepting `/api/dev-export-db` with `page.waitForResponse`) before page reloads or subsequent page setups.
  - **UI & Scene Initialization**: Arm and await a typed source readiness event (`battle-ready-for-input`, `battle-forced-switch-required`) before the visible UI action; do not inspect Pinia state from the test.
  - **FSM Coordination**: Source code emits an event after the FSM transition settles; the test observes it before sending the next visible action.
  - **Fast Failure Limit**: Interaction/click locators must use short timeouts (maximum 2 to 3 seconds for settling, unless it's a heavy initial page load) so that if something is blocked, it fails fast and loudly instead of masking latency or synchronization bugs.
- **Showdown UID Mapping Parity**: All test assertions, element selectors, and mock verifications MUST use canonical Showdown UID mappings (`showdownUidMapper.ts`) and UID-based data attributes (`data-pokemon-uid="${uid}"`, `data-item-id="${id}"`). Text-based matching (e.g. species names) or slot index guessing is strictly prohibited.
- **Exact Fainted State Synchronization Across Bench and Field Combatants**: All unit, integration, and E2E battle tests MUST verify exact fainted state synchronization (`0 fnt`, `hp <= 0`, `reviving: true`) across both active field combatants and bench party members. Tests must assert that faint transitions (`processFaint`) run to completion before switch menus or replacement choices are evaluated.
- **Zero Runtime Fallback Policy**: Test utilities, mocks, and replayers MUST NOT introduce fallback choices, default return objects, or swallow errors (`.catch(() => true)`). Missing test properties or unexpected state divergence must fail loudly and immediately with descriptive errors.
- Zero-any policy in mocks and signatures.
- All test suites run under **Vitest** (vite-node) via `vitest.workspace.ts`. Regression checks MUST ALWAYS run the full test suite (`npm run test`), never subset commands like `test:unit` or `test:node` alone.
- Keep mock definitions in sync with backend schema updates to prevent validation failures.
- **TypeScript Strict Mocking (Zero Any / Zero Unknown Casts)**: When testing components, schemas, or systems, all mock structures must be fully typed and conformant to their canonical schemas (e.g. `BattleState`, `SaveDataDto`). Never use `any`, `as unknown as`, or artificial type casts to bypass type safety. Declare complete test objects or local typed helpers.

## Work Guidance

- **Save & Reload State Roundtrip Verification**: Any store feature modifying player profile, class, or progression MUST include a full roundtrip unit test simulating the entire client lifecycle: store action -> state serialization (`serializeState`) -> schema validation (`validateAndSanitize`) -> fresh Pinia store rehydration (`updateState`) to guarantee zero persistence loss on browser refresh.
- **Immutable Backup Fixtures for Migration & Serialization Tests**: Automated test suites verifying SQL migrations, Dex compatibility, or player save serialization (`backup_saves_serialization.spec.ts`, `backup_full_validation.test.ts`) MUST exclusively load deterministic fixtures from `tests/node/fixtures/server_franco_backup_fixture.json`. Tests must NEVER load dynamic, live, or timestamped database backups from `database/backups/`, as production database snapshots evolve over time and cause test flakiness or inconsistent schema states.
- **Exhaustive Spawn Whitelist Unit Tests**: All map encounter generators (`getFinalGroundRates`) and static map databases (`FIRE_RED_MAPS`) MUST be verified against `ENABLED_POKEMON_IDS` across all day phases (`morning`, `day`, `dusk`, `night`) and all weather conditions in `tests/unit/world/spawn_integrity.spec.ts`.
- Whenever a bug is presented with a reproducing example, you MUST FIRST create a unit test (or other appropriate test) that successfully reproduces the bug (verifying it fails) before writing the fix to ensure it is never reintroduced.
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
- **Mandatory Audit Pipeline**: Running `npm run audit:full` is mandatory before any commit. It runs: ① `test:node`, ② `audit` (SASS, GPU, Node 26+), ③ `validate:fsm` (parity), ④ `validate:items/abilities/moves`, and ⑤ `validate:sql`. **`--allow-addons` is required** in the `audit:full` launch flags because Vitest 3+ uses Rolldown, which loads a platform-specific native addon (`rolldown-binding.*.node`). Without it, child processes spawned under the `--permission` model receive `ERR_DLOPEN_DISABLED` and Vitest fails to start. **`audit_full.ts` Runner Constraint**: The `Node.js Tests` task in `audit_full.ts` MUST invoke Vitest via `npm run test:node` (with `shell: true`). Never use `npx vitest` directly — `npx` may download a fresh Vitest copy without the platform-specific Rolldown native bindings (npm optional dependency bug), causing startup failures.
- **CLI-Ready Visuals**: Battle animations must be triggerable via the debug bridge (e.g. `window.__VITE_DEBUG__.battle.animations.awaitTween('attack-player')`) for headless CLI verification.

## 1. Immutable Synchronization and Simulation (E2E) Directive

- **Absolute Prohibition on Artificial Timers & GSAP Clock Standard**: It is strictly forbidden to use `setTimeout`, `page.waitForTimeout` (except for controlled micro-delay retry cycles on click failures) or any numeric wait to synchronize battle FSM transitions or scene changes in E2E simulations. All application delays, pauses, and transition intervals MUST be driven by `gsapSleep` (from `@/logic/utils/gsapHelpers`) or GSAP timelines. This enables Playwright and headless simulations to execute with instant time-scaling (`gsap.globalTimeline.timeScale(...)`) without artificial sleeps.
- **Strict UID-Based Switch Selection in BaseBattleSimulation**: In `base_battle_simulation.ts`, both voluntary and forced switch actions (`SWITCH_MENU` / `switch X`) strictly resolve target Pokémon via their canonical `uid` (`switchEntry.p1ActiveUid` or dynamic `playerSwitchSlots` mapping). Simulators locate bench cards exclusively by `data-pokemon-uid="${targetUid}"`, prohibiting slot-guessing and text matching.
- **Event-Driven and Network-Based Synchronization**: Coordination of actions and assertions must rely exclusively on typed public source events or network responses. Tests must not inspect frontend FSM/store state with `page.waitForFunction`.
- **Mandatory Inheritance and Polymorphism**: It is strictly forbidden to duplicate simulation flows, loop controls, or turn execution logic across simulators. All battle simulations must inherit from a common abstract base class (`BaseBattleSimulation`) that manages the execution loop perfectly, leaving subclasses to implement only their specific specializations (e.g., initialization, cheats, turn assertions). Before writing any new simulator or flow, stop and ask: *"Can I apply inheritance and polymorphism to leverage the existing infrastructure?"*
- **Zero-Tolerance Turn Failure Rule (Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn that cannot be executed MUST immediately terminate the simulation with a descriptive error. This includes: UI not responding (input returns false), FSM not advancing within the timeout, state desync (fuzzer choices exhausted while battle is still active), or any invalid choice rejection from the simulator. It is STRICTLY FORBIDDEN to retry, skip silently, or continue to the next turn after a turn failure. No `maxTurns` spin-loop is acceptable as a substitute for a clean battle termination. Violations waste resources, mask bugs, and hide root causes.
- **Vitest Module Isolation per Worker**: Each spec file runs in its own Vitest worker process with a fresh module registry. Module-level mutable state (arrays, interceptors, counters) is automatically isolated between specs — no explicit cleanup or mutex is needed. Exploit this to safely share stateful module singletons across a spec file without worrying about cross-spec contamination.
- **Mock HP Safety**: Mock pokemon instances used in unit/integration tests that trigger stat recalculation (`recalcPokemonStats`) MUST have their current `hp` set to a low value (e.g., `5` or `10`) to guarantee it never exceeds the newly calculated `maxHp`.
- **Playwright Workers Concurrency Rule**: By default, all Playwright test executions and simulations MUST run using Playwright's default workers/concurrency settings to maximize execution speed. Restricting execution to a single worker or forcing serial mode (`test.describe.configure({ mode: 'serial' })`) is strictly forbidden — tests within any simulation file MUST run in 100% parallel concurrency. The `npm run sim:e2e` runner script isolates separate `.simulation.ts` files from each other, but inside each file, parallelism is mandatory.
- **Simulation Passive Joystick Contract**: Simulations MUST act strictly as a passive joystick that ONLY reacts to explicit FSM readiness states emitted by the game (`WAIT_INPUT`, `SWITCH_MENU`, `over`, `REWARDS_PHASE`, `SEARCH_PHASE`). Inventing ad-hoc property heuristics or altering helpers to force early returns is strictly forbidden. Any failure or timeout indicates a root cause bug in `src/` that MUST be fixed at the source.
- **Playwright Browser Store Access Rule**: It is strictly forbidden to use dynamic imports (e.g. `import('@/stores/game')` or `import('@/stores/battle/battle')`) inside `page.evaluate` or `page.waitForFunction` to access Pinia stores. Doing so causes module resolution errors in the browser context or creates duplicate store instances. Always use the canonical store resolvers registered on the global window object, such as `(window as any).__VITE_DEBUG_STORE_RESOLVER__()` or `(window as any).__VITE_DEBUG__.getGameStore()`.
- **E2E Battle Store State Initialization**: When a battle uses background database or worker threads, source code must emit a typed readiness event after the battle store is initialized. Simulators must observe that event before entering the UI turn loop.
- **NPC AI Choice Testing (Math.random Mocking)**: Since default NPC AI configurations have a 50% random error rate (`errorRate: 0.50`), unit and integration tests that verify specific AI move choices must mock or spy on `Math.random` (`vi.spyOn(Math, 'random')`) to ensure deterministic evaluation of heuristics instead of random selection.
- **GSAP Timer Mocking & Teardown in Vitest**: When mocking `gsap.delayedCall` in `tests/vitest.setup.ts`, always call `timerId.unref()` on the created `setTimeout` handles and track active timers in a set cleared in `afterEach`. This prevents unclosed timer handles from blocking Vitest worker processes from exiting or throwing stack overflows on recursive animations.
- **Node 26 WebStorage Fork Flag**: Under Node.js 26+, child worker processes spawned via Vitest fork pools should include `execArgv: ['--no-experimental-webstorage']` in `vitest.config.ts` to prevent internal experimental WebStorage threads from keeping libuv event loops active.
- **Streamed Simulation Runner Output Mandate**: Long-running sequential simulation drivers MUST use asynchronous `spawn` with real-time `stdout`/`stderr` chunk piping instead of blocking `execSync` buffering.
- **Emoji-First Log Formatting**: All simulation and worker logs MUST start strictly with the action emoji at column 0 (`▶️`, `✅`, `❌`, `✨`, `🚀`, `⚠️`, `⏭️`) followed by `[TAG] [PROGRESS%] (CURRENT/TOTAL) Message`.

## Verification

- Run `npm run test` or `npm run audit:full` to verify test suite health.

## Reference Manuals

- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Script suite reference commands.
- [browser_testing_manual.md](../.agents/skills/project-standards/references/qa/browser_testing_manual.md): Playwright and debug bridge verification flows.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Domain module documentation for helpers.
- [integration/](./integration/AGENTS.md): Domain module documentation for integration.
- [node/](./node/AGENTS.md): Domain module documentation for node.
- [unit/](./unit/AGENTS.md): Domain module documentation for unit.
