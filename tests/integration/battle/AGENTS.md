# Purpose

Integration and simulation test suites checking full battle engine logic, log synchronization, and client-facing UI bridge state.

## Ownership

Core Engine Team / QA Engineers.

## Local Contracts

- Must utilize Vitest and run under simulated battle flows.
- Keep tests aligned with Gen 9 mechanics.
- **Real Worker & Engine Parity Contract (Anti-Mock Law)**: Suites in this directory MUST validate actual battle logic against the Showdown engine (`@pkmn/sim`) or canonical turn runners. Mocking `showdownWorkerClient.ts`, `showdownBridge.ts`, or `canonicalTurnRunner.ts` with static dummy responses to force a passing test is strictly prohibited. If a test verifies UI/store integration with simulated worker outputs, it MUST be classified as an isolated unit test in `tests/unit/battle/` and cannot substitute for genuine integration or E2E certification.
- `police_encounter_and_difficulty_integration.spec.ts`: Validates end-to-end police encounter generation, dynamic team sizing (3 to 6 Pokémon), strict level clamping to `MAX_POKEMON_LEVEL` (100) in high-level routes, bail calculation, and GameStore criminality resets.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` to verify battle integration suites.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
