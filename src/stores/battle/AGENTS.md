# Purpose

Manage battle instance states, buffs, and visual shadows for combatants.

## Ownership

Battle Engine Team / Visual FX Programmers.

## Local Contracts

- For any battle engine or FSM transitions, always conform to FSM diagrams using the validation scripts.
- **Active Battle Persistence Boundary**: `useBattleStore` state rehydrates via `@/logic/battle/orchestratorRestoreHelper.ts` on page reload (F5). Active battles restore directly into `ACTIVE_BATTLE / WAIT_INPUT` with exact combatants and logs, while minigames are strictly dropped and routed back to the search loop to enforce anti-cheat rules.
- **Modular Switch Execution Helper (`battleSwitchHelper.ts`)**: Authoritative switch orchestration in `battleStore` is delegated to `executeBattleSwitch` in `battleSwitchHelper.ts` (enforcing trapped status checks, PvP pick commits, and error logging) to maintain strict SRP and Fallow health metrics in `battle.ts`.
- **Synchronous Request & Trapped State Guard**: Client-side switch validations across `battleStore.isPlayerTrapped`, `battleSwitchHelper.ts`, `switchAction.ts`, and UI components (`BattleActionButtons.vue`, `BattleQuickTeam.vue`, `BattleArenaControls.vue`) MUST evaluate both `activeBattle.playerRequest.active[0].trapped` and `maybeTrapped` synchronously in addition to `player.trapped` and volatile counters (`bide`, `trapped`, `partiallytrapped`), preventing illegal voluntary switch picks when locked into multi-turn moves or trapping abilities before or during worker dispatch.

## Work Guidance

- Never mix visual representation timings with pure battle state evaluations.
- Use explicit resource management or cleanup loops on unmount.

## Verification

- Run `npm run validate:fsm:implementation` and `npm run test:node`.

## Key Files

- `battleEventWatchers.ts`: Module implementation.
- `battleItemUseHelper.ts`: Module implementation.
- `battleLogHelper.ts`: Module implementation.
- `battleMoveSync.ts`: Module implementation.
- `battleRechargeHelper.ts`: Module implementation.
- `battleStoreHelper.ts`: Module implementation.
- `buffs.ts`: Module implementation.
- `buffsHelper.ts`: Module implementation.
- `combatShadows.ts`: Module implementation.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
