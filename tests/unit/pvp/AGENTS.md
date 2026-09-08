# Purpose

Unit tests for Player vs Player (PvP) helpers, room code parsing, perspective adapters, and team preview state logic.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Unit tests for pure algorithmic PvP helpers (perspective inversion, room codes, preview sequencing) must run in the fast node environment.
- Any test interacting with DOM, Pinia stores, or timers must adhere to mock lifecycles and explicit resource cleanup.

## Work Guidance

- Ensure strict assertions on both Host and Guest perspective mappings.
- Validate team preview selection bounds and timer handling without unmocked intervals.
