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

## Verification

- Run `npm run test` or `npm run audit:full` to verify test suite health.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Seed helper functions and setup configurations.
- [integration/](./integration/AGENTS.md): Multi-module flow validation test suites.
- [node/](./node/AGENTS.md): Pure logic tests running under the native Node.js runner.
- [unit/](./unit/AGENTS.md): Unit tests for Vue components and stores.
