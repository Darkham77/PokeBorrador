# Purpose

Unit and domain logic test suite for the Adventure World Map system, covering pathfinding, navigation, focal-point zooming math, and move-based field capabilities.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Vitest tests under `tests/node/adventure/` must be 100% self-contained and deterministic.
- Mathematical focal-point invariant tests must verify camera bounds and transform stability across touch, buttons (+/-), and desktop mouse wheel zooming.

## Work Guidance

- Ensure all field capability evaluations reflect `gameStore.state.team` move sets and badge unlocks accurately.

## Verification

- Run `npm run test:node` to execute the node test suite.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
