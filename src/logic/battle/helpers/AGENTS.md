# Purpose

Provide standardized, decoupled helper utilities for the Showdown simulator engine, including team mapping, seed parsing, log enrichment, cheat manager, and execution wrappers.

## Ownership

Systems Engineers / Backend Developers.

## Local Contracts

- **No Window / Client Dependencies**: Helpers inside this directory must remain completely decoupled from window objects, client stores, or Vue dependencies to ensure they can run safely within Web Workers.
- **Unified Factory**: Always instantiate new Showdown simulator instances using `createShowdownBattle` to guarantee identical rules, formatting, and patches across headless fuzzers and browser contexts.
- **Deterministic Choices**: Use `choiceIndexer` and its `advanceChoiceIndices` function to progress choices identically across all environments.
- **ScriptedAI Integrity**: Never bypass or manually override simulator decisions directly in the worker client. All replayed decisions during simulations must be resolved cleanly via the `ScriptedAI` interface.
- **E2E Arena Unmount Safety**: When transitioning between battles or initializing a new fuzzer E2E scenario, always await native browser `requestAnimationFrame` cycles after clearing the battle store state. This ensures Vue reactively unmounts the previous battle arena component completely before the new battle starts, preventing cross-battle choice contamination.
- **Pre-Turn Cheat Evaluation**: Apply status and HP cheats at pre-turn using `applyPreTurnCheats` to ensure simulator states are fully synchronized before input choices are registered, preventing invalid fainted state rejections.
- **p2Skip Default False**: In `switchWorkerTurn`, `p2Skip` MUST default to `false`. It is only set to `true` when the worker explicitly signals a faint-forced switch. A voluntary player switch MUST NOT skip the AI's turn.
- **Showdown Move Format**: The correct format for sending moves to the Showdown simulator is `'move 1'` (with a space), NOT `'move1'`. The scripted AI and any choice builders MUST use the spaced format or the simulator will reject the command.
- **Faction Null Guard in Bridge**: When constructing a trainer payload for the Showdown bridge, always default `faction` to `'neutral'` when `trainer.faction === null` to prevent serialization crashes.
- **ShowdownBattleAgent as Single Protocol Source**: All battle agent implementations (fuzzer agents, AI agents) MUST extend `ShowdownBattleAgent`. Reimplementing Showdown protocol logic (forceSwitch handling, trapped checks, multi-slot iteration) outside this base class is strictly forbidden.
- **Multi-Slot Choice Format**: `decide()` MUST always return a single comma-separated string per turn (e.g. `"move 1"` for singles, `"switch 3, pass"` for doubles). Both `p1Choices[]` and `enemyChoices[]` arrays store one entry per turn using this format.
- **Canonical Stat IDs in NatureData**: `NatureData.up` and `NatureData.down` MUST use Showdown canonical stat IDs (`'atk'`, `'def'`, `'spa'`, `'spd'`, `'spe'`). Use `getStatLabel(statId)` from `statsMath.ts` for UI display. Passing localized Spanish strings to stat calculation functions is strictly forbidden.
- **choose() Return Check Mandate**: Every call to `simBattle.choose(side, choice)` MUST check the boolean return value. A `false` return indicates a rejected choice. The caller MUST handle this case (e.g. fallback to `'move 1'`) rather than ignoring it, which causes infinite stall loops.

## Work Guidance

- Modularize complex helper logic into standalone files (under 500 lines).
- Keep code fully typed with strict types from `@pkmn/sim` and local domain interfaces.

## Verification

- Run `npm run test` for all node unit tests under this directory.
- Verify FSM synchronization E2E using `npm run sim:e2e:combat`.

## Child DOX Index

- [**tests**/](./__tests__/AGENTS.md): Domain module documentation for **tests**.
