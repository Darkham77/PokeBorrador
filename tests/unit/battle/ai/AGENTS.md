# Purpose

Unit tests for the heuristic battle decision AI engine, threat assessment, sack ordering, win condition evaluation, and move set lookups.

## Ownership

Battle Engine & AI Team.

## Local Contracts

- Test all heuristic decision layers and scoring weights deterministically with isolated mock battle snapshots.
- Validate O(1) set lookups for setup moves, hazard removal, speed control, and priority moves.
