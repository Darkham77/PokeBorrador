# Purpose

Manage battle instance states, buffs, and visual shadows for combatants.

## Ownership

Battle Engine Team / Visual FX Programmers.

## Local Contracts

- For any battle engine or FSM transitions, always conform to FSM diagrams using the validation scripts.
- Visual state orchestrations must use GSAP timelines and deterministic promises.
- **Active Battle Persistence Boundary**: `useBattleStore` state rehydrates via `orchestratorRestoreHelper.ts` on page reload (F5). Active battles restore directly into `ACTIVE_BATTLE / WAIT_INPUT` with exact combatants and logs, while minigames are strictly dropped and routed back to the search loop to enforce anti-cheat rules.
- **Modular Switch Execution Helper (`battleSwitchHelper.ts`)**: Authoritative switch orchestration in `battleStore` is delegated to `executeBattleSwitch` in `battleSwitchHelper.ts` (enforcing trapped status checks, PvP pick commits, and error logging) to maintain strict SRP and keep `battle.ts` under 500 lines.

## Work Guidance

- Never mix visual representation timings with pure battle state evaluations.
- Use explicit resource management or cleanup loops on unmount.

## Verification

- Run `validate_fsm_implementation.ts` and `npm run test:node`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
