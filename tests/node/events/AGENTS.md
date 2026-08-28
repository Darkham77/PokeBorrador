# Purpose

Unit and integration tests for events system logic, offline contest rankings, and RPC emulations.

## Ownership

QA / Systems Engineers.

## Local Contracts

- Tests must be 100% self-contained and deterministic with frozen in-memory fixtures.
- Assert full ranking logic parity for competitions (e.g. Magikarp IV calculation and tiered reward generation).
- **Event Rewards & Species Database Integrity**: Automated tests (`event_database_rewards_integrity.test.ts`) must migrate an in-memory SQLite database to the latest schema, query all active records from `events_config`, and assert that all reward item IDs (`prizes.item`, `prizes.items`, `subCompetitions.prizes`) exist in `SHOP_ITEMS` and all target species exist in the Pokédex.

## Work Guidance

- Use in-memory SQLite instances or local test mocks to verify event RPC behavior without touching live databases.

## Verification

- Run `npx vitest run tests/node/events/` to execute event unit tests.
