# Purpose

Integration and simulation test suites checking full battle engine logic, log synchronization, and client-facing UI bridge state.

## Ownership

Core Engine Team / QA Engineers.

## Local Contracts

- Must utilize Vitest and run under simulated battle flows.
- Keep tests aligned with Gen 9 mechanics.
- `police_encounter_and_difficulty_integration.spec.ts`: Validates end-to-end police encounter generation, dynamic team sizing (3 to 6 Pokémon), strict level clamping to `MAX_POKEMON_LEVEL` (100) in high-level routes, bail calculation, and GameStore criminality resets.

## Verification

- Run `npm run test` to verify battle integration suites.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
