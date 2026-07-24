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
  - `showdownBridgeField.ts` — weather, terrain, side conditions (reflect, light screen, aurora veil, tailwind, spikes, stealth rock)
  - `showdownBridgeMisc.ts` — misc events (miss, crit, can't, faint, etc.)
  - `showdownBridgeCtx.ts` — shared context utilities (getPoke, getSide, etc.)
- **smogonAdapter.ts**: Shared `@smogon/calc` wrapper for the move damage tooltip. Injects actual game stats into `rawStats` (bypassing the EV/IV formula) to ensure accuracy with the adventure-mode custom stat system. Exposes `calculateDamageForTooltip()` with a 512-entry LRU cache. Field conditions (terrain, screens) flow from the bridge into `BattleState` and are consumed here to produce accurate damage ranges, KO probabilities, recovery, and recoil.
- **Tooltip Data Flow**: `showdownBridgeField.ts` → `BattleState.terrain`/`playerSideConditions`/`enemySideConditions` → `smogonAdapter.ts` → `useMoveTooltip.ts` (damageRange, koChance, recovery, recoil, fieldConditions) → `MoveTooltip.vue`.
- **Zero-Any Policy**: `showdown.worker.ts` uses `PkmnSimSide` interface for internal `@pkmn/sim` types — never use `any`.
- **HP Snapshot Helper**: Use `collectHpSnapshots(store, active)` (defined in
  `battleTurn.ts`) to collect uid-keyed HP and status maps for both sides before
  sending choices to the worker. Do NOT inline this logic again in new turn
  execution functions.
- **Struggle Recoil**: Exactly `Math.floor(maxHp / 4)` damage to the attacker. Never use approximations.
- **GSAP Exclusive**: All battle animations must use GSAP timelines/tweens. `setTimeout` is forbidden.
- **FSM Validation**: For FSM transitions, run `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts`.

- **Showdown UID Mapping (showdownUidMapper.ts)**: All mappings and synchronization between the game's reactive database/store and Showdown's simulator MUST use the unifed `showdownUidMapper.ts` helper. Never implement ad-hoc UID resolutions, `.startsWith` lookups, index-based physical slot matching, or name-based fallbacks (which violate persistence shield rules).
  - Use `getShowdownNickname(uid)` to initialize Showdown simulator names.
  - Use `findPokemonByShowdownName(expectedName, list)` to safely resolve client-side Pokémon instances from Showdown's worker logs and requests.
- **ESM Worker Output & Top-Level Await**: Todos los Web Workers que importen o dependan de archivos con *top-level await* deben compilarse en formato ES Module (configurado mediante `worker: { format: 'es' }` en `vite.config.ts`).
- **Log Bridge Imports**: Para mantener el bundle del worker aislado y evitar errores de empaquetado, los archivos del bridge (`showdownBridgeCore.ts`, `showdownBridgeField.ts`, etc.) deben cargar dinámicamente (`await import(...)`) los providers de datos del cliente como `pokemonDataProvider` en lugar de declararlos en imports estáticos a nivel de raíz.
- **Fallow Dead Export Scope (CRITICAL)**: Before removing any export flagged by Fallow as unused, you MUST `grep scripts/` for its usage. `.fallowrc.json` includes `scripts/e2e/**/*.ts` as entry points for import-graph tracking, but sub-directories like `scripts/e2e/fuzzer/**` and `scripts/e2e/battle/**` are in `ignorePatterns` for file-level analysis. This means Fallow WILL NOT detect imports from those sub-directories, making their consumed exports appear dead. If the export is used in any script, add it to `ignoreExports` in `.fallowrc.json` instead of removing it.
- **AI Team Generation**: AI competitive moveset generation depends on `ACTIVE_AI_TEAM_GENERATION_GEN` from constants.ts. If a species lacks randombattle data in that specific generation, gracefully handle the error and fallback to generic pool members or getTeam() candidates.
- **Action Validation & Faint Interception**: Never send combat actions (`move` or `struggle`) to the Showdown simulator if the active Pokemon is fainted or if the simulator request has an active `forceSwitch` state. Intercept these actions early in `executeTurn` and `executeFlee`. If fainted (HP <= 0), trigger `processFaint` to run the faint animations and logs before showing the switch menu. If alive, use `handleForceSwitch` to switch directly.
- **Zero-Timer Forced Switch Animations**: When executing forced switch animations (like PLAY_ESCAPE_ANIM for Whirlwind/Roar on player side), await exclusively the GSAP promise from `ctx.animations.awaitTween` to sequence the menu transition. Using `sleep` or numeric timeout fallbacks is strictly prohibited.
- **Showdown Combat Log 1:1 Protocol Parity**:
  - The canonical source of truth for all battle protocol events is `external/pokemon-showdown-code/protocol/src/index.ts` (`BattleMajorArgs` & `BattleMinorArgs`).
  - All battle protocol commands MUST be explicitly recognized and handled in `showdownBridgeCore.ts`, `showdownBridgeField.ts`, `showdownBridgeStages.ts`, or `showdownBridgeMisc.ts`.
  - Damage residual causes (`[from] psn`, `[from] Sandstorm`, `[from] Leech Seed`, etc.), statuses/cures, volatile start/end (`confusion`, `disable`, `substitute`, etc.), charge moves (`-prepare`), single-turn protection (`Protect`), and field effects MUST produce localized Spanish messages in the combat log.
  - Verification tests (`showdown_protocol_exhaustive_parity.spec.ts`) must dynamically validate that 100% of Showdown's battle protocol commands are handled by the bridge without unhandled fall-throughs.

- **Request State Snapshotting Rule**: When evaluating player choice eligibility in multi-seat battle loops (`executeBattleTurn`), initial request states (`p1KindBefore`, `p2KindBefore`) MUST be snapshotted BEFORE executing any choices. Mid-loop state mutations resulting from a `force-switch` resolution MUST NOT alter the acting eligibility of other seats during the same turn step.
- **Symmetric Seat Resolution**: Missing or unprovided choices for any seat (`p1`, `p2`, `p3`, `p4`) in `isScriptedReplayMode` MUST be resolved generically inside `showdownExecutor.ts` using `ShowdownBattleRunner`, guaranteeing 1:1 seat parity.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- New Showdown log handlers go in the most specific sub-module; if none fits, add to `showdownBridgeMisc.ts` and refactor later.
- Keep `BattleArenaControls.vue` under 500 lines by extracting overlay logic into dedicated `*Overlay.vue` components.

## Verification

- Run `npm run test` — includes `struggle.spec.ts`, `pp_softlock.test.ts`, `faint_interrupts_log_playback.spec.ts`.
- Run `npm run audit:warnings-diff` for zero-error gate.

## Child DOX Index

- [actions/](./actions/AGENTS.md): Domain module documentation for actions.
- [ai/](./ai/AGENTS.md): Domain module documentation for ai.
- [helpers/](./helpers/AGENTS.md): Domain module documentation for helpers.
