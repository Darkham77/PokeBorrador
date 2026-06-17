# Purpose

Automated testing suites ensuring correctness, visual regression prevention, and performance.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Zero-any policy in mocks and signatures.
- Parity with Node 26+ native runner for pure logic.

## Work Guidance

- Use `node:test` for logic unit tests (saves Vitest overhead).
- Playwright is preferred for E2E browser testing.
- When dynamic store mocks are needed, declare local mock interfaces instead of using `as any`.
- Update test cases immediately when source function signatures change.

## Verification

- Run `npm run test` or `npm run audit:full` to verify test suite health.

## Child DOX Index

- [helpers/](./helpers/AGENTS.md): Seed helper functions and setup configurations.
- [integration/](./integration/AGENTS.md): Multi-module flow validation test suites.
- [node/](./node/AGENTS.md): Pure logic tests running under the native Node.js runner.
- [unit/](./unit/AGENTS.md): Unit tests for Vue components and stores.
