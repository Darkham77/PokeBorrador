# Purpose

Manage the logic and assets of map.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Decomposed Card Animation Helpers (`mapCardAnimationHelpers.ts`)**:
  - Complex timeline builders for map card tags, factions, fishing bobbing, archaeology swings, and rare/atmospheric spawn auras are isolated into pure animation helper functions to maintain minimal cognitive complexity in `useMapCardAnimations.ts`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
