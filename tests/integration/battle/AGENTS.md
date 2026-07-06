# Purpose

Integration and simulation test suites checking full battle engine logic, log synchronization, and client-facing UI bridge state.

## Ownership

Core Engine Team / QA Engineers.

## Local Contracts

- Must utilize Vitest and run under simulated battle flows.
- Keep tests aligned with Gen 9 mechanics.

## Verification

- Run `npm run test` or target specific specs (e.g. `npx vitest run tests/integration/battle/showdown_integration.spec.ts`).
