# Purpose

Core logic, simulation loops, battle agent decisions, and Pinia battle store mocks for the Gen 9 combat fuzzer.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Modules must remain decoupled from Vitest.
- Must only use reactive Vue store mocks to execute the battle state.
