# Purpose

Manage the logic and assets of evolution.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Evolution Scene Decomposition (`EvolutionScene.vue`, `EvolutionSpriteStage.vue`, `EvolutionDialogInfo.vue`, `evolutionTypes.ts`)**: Encapsulates the stage sprites, glow backgrounds, flashing cycles, and image error handling into `EvolutionSpriteStage.vue`, and the dialogue announcements, completion messages, and cancellation controls into `EvolutionDialogInfo.vue`. Strictly types evolution progress states via canonical tuple union `EvolutionStep` in `evolutionTypes.ts`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
