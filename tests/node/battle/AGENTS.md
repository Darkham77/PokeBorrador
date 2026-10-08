# Purpose

Node.js logical tests for battle engine execution, faint sequences, forced switches, pivot moves, phazing, and Showdown simulator synchronization.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Key Test Suites

- `reproduce_enemy_faint_switch.test.ts`: Deterministic reproduction of faint replacement and mid-turn switch timing.
- `test_similar_switch_and_faint_mechanics.test.ts`: Comprehensive parity tests for pivots (U-turn, Volt Switch), self-destruct (Explosion), fatal recoil (Head Smash), forced phazing (Dragon Tail), item switches (Eject Button), and ability switches (Emergency Exit).
- `fuzzer_reproduced_cases.test.ts`: Consolidated deterministic fixture replayer certifying 11 recorded fuzzer battle scenarios turn-by-turn.
- `special_actions_mechanics.test.ts`: Mechanics validation for special battle actions (`leech_seed`, `curse`, `destiny_bond`, `perish_song`, `transform`, `belly_drum`, `stockpile`, `rapid_spin`).

## Key Files

- [`heuristic_ai_fuzzer_helpers.ts`](./heuristic_ai_fuzzer_helpers.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
