# Purpose

Unit tests for Pinia state stores, reactive getters, and O(1) state indexed lookups.

## Ownership

State Management & Store Infrastructure Team.

## Local Contracts

- Initialize Pinia before each test using `setActivePinia(createPinia())`.
- Verify reactive computation of indexed maps (`pokemonByUid`), sets (`caughtSpeciesSet`, `seenSpeciesSet`), and domain state mutations.
- `trade_store_lifecycle.spec.ts`: Unit tests for trade store lifecycle, item/pokemon offer validation, and UID locking.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [events/](./events/AGENTS.md): Domain module documentation for events store tests.
