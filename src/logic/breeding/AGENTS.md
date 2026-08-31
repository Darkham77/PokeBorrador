# Purpose

Manage the logic and assets of breeding.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Newborn Move Inheritance Level 1 Legality Mandate**: When computing inherited moves for newborn Pokémon in `inheritMoves` (`breedingEngine.ts`), shared parent moves MUST be strictly validated via `canLearnMove(babyId, moveId, 1)`. Moves learnable exclusively through high-level level-up (and not classified as TMs, Tutors, or Egg Moves) must NEVER be assigned to a newborn Level 1 Pokémon at birth.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
