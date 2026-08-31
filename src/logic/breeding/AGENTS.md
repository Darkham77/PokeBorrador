# Purpose

Manage the logic and assets of breeding.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Newborn Move Inheritance Level 1 Legality Mandate**: When computing inherited moves for newborn Pokémon in `inheritMoves` (`breedingEngine.ts`), shared parent moves MUST be strictly validated via `canLearnMove(babyId, moveId, 1)`. Moves learnable exclusively through high-level level-up (and not classified as TMs, Tutors, or Egg Moves) must NEVER be assigned to a newborn Level 1 Pokémon at birth.
- **Universal Baby Form Resolution Mandate**: Whenever breeding, generating eggs (`eggFactory.ts`), calculating offspring species (`getEggSpecies` in `breedingEngine.ts`), or creating debug eggs, the system MUST ALWAYS resolve and instantiate the canonical Level 1 Baby form for all evolutionary lines possessing a baby stage (such as *Budew*, *Munchlax*, *Happiny*, *Pichu*, *Azurill*, *Smoochum*, *Tyrogue*, *Togepi*, *Toxel*). Offspring and eggs must never inherit or instantiate adult evolutionary stages.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This domain module does not contain nested sub-directories with independent AGENTS.md files.*
