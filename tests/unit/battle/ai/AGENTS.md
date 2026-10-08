# Purpose

Unit tests for the heuristic battle decision AI engine, threat assessment, sack ordering, win condition evaluation, and move set lookups.

## Ownership

Battle Engine & AI Team.

## Local Contracts

- Test all heuristic decision layers and scoring weights deterministically with isolated mock battle snapshots.
- Validate O(1) set lookups for setup moves, hazard removal, speed control, and priority moves.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
