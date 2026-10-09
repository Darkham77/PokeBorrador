# Purpose

This directory provides Pinia reactive state stores for studio editing, continental map generation, and adventure camera lens state.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Stores in this subtree belong strictly to the `test_aventura` sandbox.
- Mutations must follow standard Pinia Composition API action patterns.
- Undo/redo stacks are bounded by `STUDIO_MAX_HISTORY_STEPS`.

## Key Files

- [`continentStudio.ts`](./continentStudio.ts): Reactive state and action handlers for the continental generator.
- [`continentStudioStore.ts`](./continentStudioStore.ts): Modular store wrapper for continent state orchestration.
- [`mapAdventureStudio.ts`](./mapAdventureStudio.ts): Macro-regional graph and route editing store.
- [`mapLens.ts`](./mapLens.ts): Camera viewport zoom, pan, and transform state.
- [`mapStudio.ts`](./mapStudio.ts): Micro-cell tile editor and canvas tool selection store.

## Work Guidance

- Prefer refs and computed properties inside `defineStore` setup functions.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
