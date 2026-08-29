# Purpose

Unit tests for Pinia state stores, reactive getters, and O(1) state indexed lookups.

## Ownership

State Management & Store Infrastructure Team.

## Local Contracts

- Initialize Pinia before each test using `setActivePinia(createPinia())`.
- Verify reactive computation of indexed maps (`pokemonByUid`), sets (`caughtSpeciesSet`, `seenSpeciesSet`), and domain state mutations.
