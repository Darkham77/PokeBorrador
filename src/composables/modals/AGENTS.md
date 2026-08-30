# Purpose

Manage the logic and assets of modals.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Event-Driven Spawn Resolution Governance**:
  - Composables that compute route spawns (`useRouteSpawnsWild`, `useRouteSpawnsFishing`) MUST safely handle dynamic events by using `safeParse`, resolving weekly rotations (`resolveWeeklyRotation`), ignoring wildcard `'*'` open events, and validating species tokens with `isPokemonSpeciesId()` before invoking domain-type assertions or generating tooltips.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
