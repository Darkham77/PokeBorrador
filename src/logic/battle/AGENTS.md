# Purpose

Manage the logic and assets of battle, including the FSM orchestrator, combat engine, and the Showdown simulator bridge.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Showdown Side Synchronization**: When synchronizing health and statuses between the local reactive game state and the Showdown simulator (via `syncSideStates` in the worker), always map and send values in the **original team order**. The simulator's `side.pokemon` array remains in its original order throughout the battle; using active-swapped orders (e.g., `playerOrder` or `enemyOrder`) results in index mismatches, corrupting simulator state during switches or item usage and throwing `INVALID_CHOICE` exceptions.
- **showdownBridge Architecture**: The Showdown log parser is split into focused modules. The main `showdownBridge.ts` is a dispatcher (< 100 lines). Add new handlers in the appropriate sub-module:
  - `showdownBridgeCore.ts` — battle start, turn, request, player setup
  - `showdownBridgeStages.ts` — stat stage changes (-boost, +boost)
  - `showdownBridgeField.ts` — weather, terrain, side conditions
  - `showdownBridgeMisc.ts` — misc events (miss, crit, can't, faint, etc.)
  - `showdownBridgeCtx.ts` — shared context utilities (getPoke, getSide, etc.)
- **Zero-Any Policy**: `showdown.worker.ts` uses `PkmnSimSide` interface for internal `@pkmn/sim` types — never use `any`.
- **Struggle Recoil**: Exactly `Math.floor(maxHp / 4)` damage to the attacker. Never use approximations.
- **GSAP Exclusive**: All battle animations must use GSAP timelines/tweens. `setTimeout` is forbidden.
- **FSM Validation**: For FSM transitions, run `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- New Showdown log handlers go in the most specific sub-module; if none fits, add to `showdownBridgeMisc.ts` and refactor later.
- Keep `BattleArenaControls.vue` under 500 lines by extracting overlay logic into dedicated `*Overlay.vue` components.

## Verification

- Run `npm run test` — includes `struggle.spec.ts`, `pp_softlock.test.ts`, `faint_interrupts_log_playback.spec.ts`.
- Run `npm run audit:warnings-diff` for zero-error gate.

## Child DOX Index

- [actions/](./actions/AGENTS.md): Combat action triggers and move execution steps.
- [ai/](./ai/AGENTS.md): NPC opponent move priority decision and scoring logic.
