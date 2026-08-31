# Purpose

Manage the logic and assets of breeding.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Hatch Animation Baby Species Parity Mandate**: When preparing the visual preview in `HatchAnimationModal.vue` (`prepareResult`), the component MUST resolve the species ID through `getEggSpecies(rawSpeciesId)` ensuring 1:1 visual parity with the baby stage, sprite, and stats created in the final save. Displaying evolved parent forms during the hatching sequence is strictly forbidden.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
