# Purpose

Unit and integration tests for events system logic, offline contest rankings, and RPC emulations.

## Ownership

QA / Systems Engineers.

## Local Contracts

- Tests must be 100% self-contained and deterministic with frozen in-memory fixtures.
- Assert full ranking logic parity for competitions (e.g. Magikarp IV calculation and tiered reward generation).

## Work Guidance

- Use in-memory SQLite instances or local test mocks to verify event RPC behavior without touching live databases.

## Verification

- Run `npx vitest run tests/node/events/` to execute event unit tests.
