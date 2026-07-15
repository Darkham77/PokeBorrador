# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- **RULE #1: Event-Driven Simulation Sync (No Timers)**: It is STRICTLY FORBIDDEN to use manual timers, timeouts, or sleep delays (e.g. `setTimeout`, `page.waitForTimeout`, `sleep`) to coordinate transitions, page reloads, scene loads, or database saves during simulations. Synchronization MUST be strictly event-driven:
  - **Database & Disk Sync**: Wait for specific network responses (e.g. intercepting `/api/dev-export-db` with `page.waitForResponse`) before page reloads or subsequent page setups.
  - **UI & Scene Initialization**: Wait on Pinia stores reactive states (e.g. `waitForStoreReady` to check `store.isReady === true`) instead of arbitrary page wait times.
  - **FSM Coordination**: Wait for FSM state/substate changes to settle before sending actions.
  - **Fast Failure Limit**: Interaction/click locators must use short timeouts (maximum 2 to 3 seconds for settling, unless it's a heavy initial page load) so that if something is blocked, it fails fast and loudly instead of masking latency or synchronization bugs.
- Zero-any policy in mocks and signatures.
- All test suites run under **Vitest** (vite-node) via `vitest.workspace.ts`.
- Keep mock definitions in sync with backend schema updates to prevent validation failures.
- Use the DBRouter to isolate E2E local database queries from external profiles.
- **TypeScript Strict Mocking (No any)**: When testing components with generic wrappers or stubbed properties where props are not fully inferred, do NOT cast variables or properties to "any". Define explicit interfaces local to the spec file and cast via double assertion (e.g. `wrapper.props() as unknown as CustomProps`) to preserve the Zero-Any integrity rule.

## Work Guidance

- Whenever a bug is presented with a reproducing example, you MUST FIRST create a unit test (or other appropriate test) that successfully reproduces the bug (verifying it fails) before writing the fix to ensure it is never reintroduced.
- **Runner**: All tests use Vitest. `tests/node/` runs with `environment: 'node'`; `tests/unit/` and `tests/integration/` run with `environment: 'jsdom'`.
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
- ## 1. Immutable Synchronization and Simulation (E2E) Directive

- **Absolute Prohibition on Artificial Timers**: It is strictly forbidden to use `setTimeout`, `page.waitForTimeout` (except for controlled micro-delay retry cycles on click failures) or any numeric wait to synchronize battle FSM transitions or scene changes in E2E simulations.
- **Event-Driven and Network-Based Synchronization**: Coordination of actions and assertions must rely exclusively on network event monitoring (e.g., intercepting database exports or WebSockets) and the frontend FSM state (e.g., waiting for `store.currentFsmState`, `store.currentSubState` and `!store.isProcessing` in a `page.waitForFunction`), ensuring execution speed independence.
- **Mandatory Inheritance and Polymorphism**: It is strictly forbidden to duplicate simulation flows, loop controls, or turn execution logic across simulators. All battle simulations must inherit from a common abstract base class (`BaseBattleSimulation`) that manages the execution loop perfectly, leaving subclasses to implement only their specific specializations (e.g., initialization, cheats, turn assertions). Before writing any new simulator or flow, stop and ask: *"Can I apply inheritance and polymorphism to leverage the existing infrastructure?"*
- **Zero-Tolerance Turn Failure Rule (Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn that cannot be executed MUST immediately terminate the simulation with a descriptive error. This includes: UI not responding (input returns false), FSM not advancing within the timeout, state desync (fuzzer choices exhausted while battle is still active), or any invalid choice rejection from the simulator. It is STRICTLY FORBIDDEN to retry, skip silently, or continue to the next turn after a turn failure. No `maxTurns` spin-loop is acceptable as a substitute for a clean battle termination. Violations waste resources, mask bugs, and hide root causes.
- **Vitest Module Isolation per Worker**: Each spec file runs in its own Vitest worker process with a fresh module registry. Module-level mutable state (arrays, interceptors, counters) is automatically isolated between specs — no explicit cleanup or mutex is needed. Exploit this to safely share stateful module singletons across a spec file without worrying about cross-spec contamination.
- **Mock HP Safety**: Mock pokemon instances used in unit/integration tests that trigger stat recalculation (`recalcPokemonStats`) MUST have their current `hp` set to a low value (e.g., `5` or `10`) to guarantee it never exceeds the newly calculated `maxHp`.
- **Playwright Workers Concurrency Rule**: By default, all Playwright test executions and simulations MUST run using Playwright's default workers/concurrency settings to maximize execution speed. Restricting execution to a single worker (`--workers=1`) is strictly forbidden unless there is an active emergency or clear evidence/suspicion of concurrency conflicts (such as database locking or Vite HMR/dev server load timeouts).
- **Playwright Browser Store Access Rule**: It is strictly forbidden to use dynamic imports (e.g. `import('@/stores/game')` or `import('@/stores/battle/battle')`) inside `page.evaluate` or `page.waitForFunction` to access Pinia stores. Doing so causes module resolution errors in the browser context or creates duplicate store instances. Always use the canonical store resolvers registered on the global window object, such as `(window as any).__VITE_DEBUG_STORE_RESOLVER__()` or `(window as any).__VITE_DEBUG__.getGameStore()`.
- **E2E Battle Store State Initialization**: When starting a battle that uses background database or worker threads, the battle store state (`store.state`) may take several milliseconds to initialize. Simulators must wait reactively for `store.state` to be defined (using `page.waitForFunction`) before entering the turn loop, ensuring that checks for `!store.state || store.state.over` do not trigger premature exit.
- **NPC AI Choice Testing (Math.random Mocking)**: Since default NPC AI configurations have a 50% random error rate (`errorRate: 0.50`), unit and integration tests that verify specific AI move choices must mock or spy on `Math.random` (`vi.spyOn(Math, 'random')`) to ensure deterministic evaluation of heuristics instead of random selection.

## Verification

- Run `npm run test` or `npm run audit:full` to verify test suite health.

## Reference Manuals

- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Script suite reference commands.
- [browser_testing_manual.md](../.agents/skills/project-standards/references/qa/browser_testing_manual.md): Playwright and debug bridge verification flows.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Seed helper functions and setup configurations.
- [integration/](./integration/AGENTS.md): Multi-module flow validation test suites.
- [node/](./node/AGENTS.md): Pure logic tests running under Vitest with `environment: 'node'`.
- [unit/](./unit/AGENTS.md): Unit tests for Vue components and stores.
