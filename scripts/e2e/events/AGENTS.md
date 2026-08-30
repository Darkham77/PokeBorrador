# Purpose

Playwright E2E simulation suites for special calendar and competition events (fishing boost, Magikarp IVs contest, EXP multipliers, and reward claims).

## Ownership

QA / Automation Engineers.

## Local Contracts

- Multi-player event scenarios must use shared ephemeral SQLite databases in RAM without mutating live databases.
- Event simulations must interact with the application UI exclusively through deterministic element IDs (`#id`).
- Combat logs and event reward distributions must be verified using typed event listeners and store state assertions.

## Work Guidance

- Use `FishingEventSimulation` and `MagikarpContestSimulationWrapper` as reusable wrappers for event E2E test flows.
- Always reload SQLite binary snapshots (`initSQLite({ forceReload: true })`) before querying shared event awards across multiple browser contexts.

## Verification

- Run `npm run sim:e2e:events` to execute event scenario simulations.
