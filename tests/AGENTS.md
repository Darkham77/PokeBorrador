# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Zero-any policy in mocks and signatures.
- Parity with Node 26+ native runner for pure logic.

## Work Guidance

- Whenever a bug is presented with a reproducing example, you MUST FIRST create a unit test (or other appropriate test) that successfully reproduces the bug (verifying it fails) before writing the fix to ensure it is never reintroduced.
- Use `node:test` for logic unit tests (saves Vitest overhead).
- Playwright is preferred for E2E browser testing.
- When dynamic store mocks are needed, declare local mock interfaces instead of using `as any`.
- Update test cases immediately when source function signatures change.
- **Bare Node.js vs Vitest Boundaries**: Bare Node.js tests (`tests/node/`) must ONLY import pure math/logic files with no external `@/` path alias dependencies. Any tests involving components, stores, database routing, or modules containing `@/` imports must be written in Vitest under `tests/unit/` or `tests/integration/`.
- **Array Indexing and Type Narrowing in Tests**: To satisfy strict type checking under `noUncheckedIndexedAccess` without using `any` or bypassing rules, avoid referencing array elements directly (e.g. `arr[0]`). Extract them to local variables and perform explicit existence assertions or throw errors if undefined to narrow their types.
- **Dynamic Store Loading**: In unit tests, avoid static imports of Vue/Pinia store modules if running in Node.js test runners. Use dynamic imports protected by `typeof window !== 'undefined'` checks.
- **Extension-First Imports**: Internal imports in Node native tests must include the `.ts` extension (e.g. `import { foo } from './bar.ts'`) and use relative paths instead of path aliases.
- **Mandatory Audit Pipeline**: Running `npm run audit:full` is mandatory before any commit. It runs: ① `test:node`, ② `audit` (SASS, GPU, Node 26+), ③ `validate:fsm` (parity), ④ `validate:items/abilities/moves`, and ⑤ `validate:sql`.
- **CLI-Ready Visuals**: Battle animations must be triggerable via the debug bridge (e.g. `window.__VITE_DEBUG__.battle.animations.awaitTween('attack-player')`) for headless CLI verification.

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
