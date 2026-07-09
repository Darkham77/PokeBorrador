# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Zero-any policy in mocks and signatures.
- All test suites run under **Vitest** (vite-node) via `vitest.workspace.ts`.

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
- **Mandatory Audit Pipeline**: Running `npm run audit:full` is mandatory before any commit. It runs: ① `test:node`, ② `audit` (SASS, GPU, Node 26+), ③ `validate:fsm` (parity), ④ `validate:items/abilities/moves`, and ⑤ `validate:sql`.
- **CLI-Ready Visuals**: Battle animations must be triggerable via the debug bridge (e.g. `window.__VITE_DEBUG__.battle.animations.awaitTween('attack-player')`) for headless CLI verification.
- **FSM State Sychronization in E2E Tests**: When automating battles with Playwright, do not assume that the FSM will immediately transition to the next turn number if a Pokémon faints. Fainting and mandatory replacement switches occur during the active turn (e.g. `SWITCH_MENU` or `PLAYER_FAINT_SEQ`). The synchronization helper (`waitForWaitInput`) must track progress based on the `(currentTurn, currentSubState)` tuple rather than just turn count, preventing infinite wait timeouts when a turn does not increment.
- **Vitest Module Isolation per Worker**: Each spec file runs in its own Vitest worker process with a fresh module registry. Module-level mutable state (arrays, interceptors, counters) is automatically isolated between specs — no explicit cleanup or mutex is needed. Exploit this to safely share stateful module singletons across a spec file without worrying about cross-spec contamination.

## Verification

- Run `npm run test` or `npm run audit:full` to verify test suite health.

## Reference Manuals

- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Script suite reference commands.
- [browser_testing_manual.md](../.agents/skills/project-standards/references/qa/browser_testing_manual.md): Playwright and debug bridge verification flows.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Seed helper functions and setup configurations.
- [integration/](./integration/AGENTS.md): Multi-module flow validation test suites.
- [node/](./node/AGENTS.md): Pure logic tests running under the native Node.js runner.
- [unit/](./unit/AGENTS.md): Unit tests for Vue components and stores.
