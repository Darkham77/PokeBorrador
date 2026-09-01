# tests/unit/stores/events/

Unit tests for event stores and prize granting logic.

## Ownership

State Architecture / QA Engineers.

## Local Contracts

- Test event awards, money grants, BC distribution, and Pokemon prize actions in isolation.
- `test_event_prize_grantor.spec.ts`: Unit tests verifying atomic reward delivery and UI notifications for event prize types.

## Verification

- Run `npm run test` to verify event store unit tests.
