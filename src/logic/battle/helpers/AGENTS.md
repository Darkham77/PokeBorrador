# Purpose

Provide standardized, decoupled helper utilities for the Showdown simulator engine, including team mapping, seed parsing, log enrichment, cheat manager, and execution wrappers.

## Ownership

Systems Engineers / Backend Developers.

## Local Contracts

- **No Window / Client Dependencies**: Helpers inside this directory must remain completely decoupled from window objects, client stores, or Vue dependencies to ensure they can run safely within Web Workers.
- **Unified Factory**: Always instantiate new Showdown simulator instances using `createShowdownBattle` to guarantee identical rules, formatting, and patches across headless fuzzers and browser contexts.
- **Deterministic Choices**: Use `choiceIndexer` and its `advanceChoiceIndices` function to progress choices identically across all environments.
- **ScriptedAI Integrity**: Never bypass or manually override simulator decisions directly in the worker client. All replayed decisions during simulations must be resolved cleanly via the `ScriptedAI` interface.
- **Pre-Turn Cheat Evaluation**: Apply status and HP cheats at pre-turn using `applyPreTurnCheats` to ensure simulator states are fully synchronized before input choices are registered, preventing invalid fainted state rejections.

## Work Guidance

- Modularize complex helper logic into standalone files (under 500 lines).
- Keep code fully typed with strict types from `@pkmn/sim` and local domain interfaces.

## Verification

- Run `npm run test` for all node unit tests under this directory.
- Verify FSM synchronization E2E using `npm run sim:e2e:combat`.

## Child DOX Index

- [**tests**/](./__tests__/AGENTS.md): Unit tests for battle simulator helpers.
