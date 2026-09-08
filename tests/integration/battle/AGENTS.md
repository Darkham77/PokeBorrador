# Purpose

Integration and simulation test suites checking full battle engine logic, log synchronization, and client-facing UI bridge state.

## Ownership

Core Engine Team / QA Engineers.

## Local Contracts

- Must utilize Vitest and run under simulated battle flows.
- Keep tests aligned with Gen 9 mechanics.
- **Real Worker & Engine Parity Contract (Anti-Mock Law)**: Suites in this directory MUST validate actual battle logic against the Showdown engine (`@pkmn/sim`) or canonical turn runners. Mocking `showdownWorkerClient.ts`, `showdownBridge.ts`, or `canonicalTurnRunner.ts` with static dummy responses to force a passing test is strictly prohibited. If a test verifies UI/store integration with simulated worker outputs, it MUST be classified as an isolated unit test in `tests/unit/battle/` and cannot substitute for genuine integration or E2E certification.
- `police_encounter_and_difficulty_integration.spec.ts`: Validates end-to-end police encounter generation, dynamic team sizing (3 to 6 Pokémon), strict level clamping to `MAX_POKEMON_LEVEL` (100) in high-level routes, bail calculation, and GameStore criminality resets.

## Verification

- Run `npm run test` to verify battle integration suites.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
