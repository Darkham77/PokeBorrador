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
  - `showdownBridgeField.ts` — weather, terrain, side conditions (reflect, light screen, aurora veil, tailwind, spikes, stealth rock); split into modular sub-helpers (`handleWeatherEvent`, `handleStartVolatileEvent`, `handleEndVolatileEvent`, `handleSideConditionEvent`, `handleFieldConditionEvent`) to keep cognitive complexity low (< 15).
  - `showdownBridgeMisc.ts` — misc events (miss, crit, can't, faint, etc.)
  - `showdownBridgeCtx.ts` — shared context utilities (getPoke, getSide, etc.)
- **smogonAdapter.ts**: Shared `@smogon/calc` wrapper for the move damage tooltip. Injects actual game stats into `rawStats` (bypassing the EV/IV formula) to ensure accuracy with the adventure-mode custom stat system. Exposes `calculateDamageForTooltip()` with a 512-entry LRU cache. Field conditions (terrain, screens) flow from the bridge into `BattleState` and are consumed here to produce accurate damage ranges, KO probabilities, recovery, and recoil.
- **Tooltip Data Flow**: `showdownBridgeField.ts` → `BattleState.terrain`/`playerSideConditions`/`enemySideConditions` → `smogonAdapter.ts` → `useMoveTooltip.ts` (damageRange, koChance, recovery, recoil, fieldConditions) → `MoveTooltip.vue`.
- **statBreakdownHelper.ts**: Centralized, modular stat calculation engine that computes effective stats and comprehensive breakdown metadata (base value, stages, stage multiplier, weather multiplier, ability multiplier, item multiplier, status multiplier, field multiplier, and modifier source descriptions) across combatants. Consumed by `battleMath.ts`, `battleFormulas.ts`, and `BattleInfoCard.vue`.
- **Zero-Any Policy**: `showdown.worker.ts` uses `PkmnSimSide` interface for internal `@pkmn/sim` types — never use `any`.
- **HP Snapshot Helper**: Use `collectHpSnapshots(store, active)` (defined in
  `battleTurn.ts`) to collect uid-keyed HP and status maps for both sides before
  sending choices to the worker. Do NOT inline this logic again in new turn
  execution functions.
- **Struggle Recoil**: Exactly `Math.floor(maxHp / 4)` damage to the attacker. Never use approximations.
- **GSAP Exclusive**: All battle animations must use GSAP timelines/tweens. `setTimeout` is forbidden.
- **Persistent Singleton Showdown Web Worker**: The Showdown Web Worker (`showdown.worker.ts`) MUST remain alive as a warm singleton across consecutive battles. Terminating the worker (`terminate()`) between battles is strictly forbidden as it induces multi-second module compilation delays. Battles must be reset exclusively via the native `INIT_BATTLE` message, which instantiates a fresh `@pkmn/sim` `Battle` object and resets caches in <5ms.
- **FSM Validation**: For FSM transitions, run `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts`.

- **Showdown UID Mapping (showdownUidMapper.ts)**: All mappings and synchronization between the game's reactive database/store and Showdown's simulator MUST use the unifed `showdownUidMapper.ts` helper. Never implement ad-hoc UID resolutions, `.startsWith` lookups, index-based physical slot matching, or name-based fallbacks (which violate persistence shield rules).
- **Unified Stat Clamping & Parity**: All stat stage calculations (including accuracy and evasion) MUST enforce an unconditional clamp bounds of `[-6, +6]` across both `battleMath.ts` and `moveCalculator.ts`. `STAGE_MULTIPLIERS_STAT` MUST use exact fractional ratios (`2/3`, `1/3`, `2/7`) for negative stages matching Pokémon Showdown `sim/pokemon.ts`. Silent catch blocks inside composables or provider lookups (such as `useCombatantStatus.ts`) MUST NOT swallow underlying errors, but safely provide default UI descriptions while logging diagnostics to `logger.debug`.
- **Showdown Nature Casing Constraint**: Showdown Dex methods return `Nature.name` capitalized (e.g. `'Adamant'`), but internal simulator representations, `PokemonSet` objects, and local `GamePokemon` stores strictly require lowercase strings (e.g. `'adamant'`). Converting natures to capitalized strings in adapters or client stores is strictly prohibited.
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
- **Showdown Active Combatant Sync**: Handlers for `|switch|` and `|drag|` events in `showdownBridgeCore.ts` must update `store.activeBattle.value.enemy` and `store.activeBattle.value.player` as well as parse status/HP conditions (`fnt`, `100/100`).
- **Ability Effect Guards in Field/End Handlers**: `|-start|` and `|-end|` log parsing in `showdownBridgeField.ts` must check if `effect.startsWith('ability:')` before passing `effect` into `pokemonDataProvider.getMoveData()`.
- **Combat Log Sprite Source Mapping**: Trainer-initiated events (challenges, switches, Rocket ambushes, item usage) must strictly use `'enemy_trainer'` or `'player'` as the `source` argument for `addLog`.
- **ShowdownBattleRunner & Manual Scenario Separation**: `ShowdownBattleRunner` strictly resolves pre-recorded choice stream indices for fuzzer batch replays (`playerChoices` present). It MUST NEVER be patched with ad-hoc choice fallbacks (e.g. forcing `'move 1'`) to force manual UI scenario tests (e.g. `battle_manual_scenarios.simulation.ts`) to pass. Manual scenario tests test dynamic UI/FSM workflows and MUST execute native game AI logic (`CombatAI` / `ScriptedAI`). `ShowdownBattleRunner` encapsulates readiness checks internally to avoid repeating FSM substate guards at invocation sites.

- **Battle State Persistence (Volatile vs Non-Volatile)**:
  - **ALL volatile statuses MUST be cleared when a battle ends** (win, lose, or flee). This is the canonical Pokémon rule.
  - Only non-volatile statuses (`burn`, `psn`, `par`, `slp`, `frz`, `tox`) and base stats (`hp`, `pp`, `item`) survive between battles.
  - `clearVolatileStatus(poke)` in `battleStatus.ts` is the authoritative function for Pokémon-level volatile clearing. Call it for every team member on `terminateBattle` (`resolution.ts`) and at the start of every new battle (`orchestrator.ts`).
  - `resetActiveBattleState(ctx, player, isGym)` in `orchestratorStateHelper.ts` is the authoritative function for BattleState-level clearing. It resets `weather`, `terrain`, `fieldConditions`, `playerSideConditions`, `enemySideConditions`, `pendingSlotEffects`, `playerRequest`, `enemyRequest`, and stat stages.

- **Future Sight / Doom Desire — Slot Condition Model**:
  - Future Sight and Doom Desire are **slot conditions**, NOT Pokémon volatiles. They live on `BattleState.pendingSlotEffects: PendingSlotEffect[]`.
  - The `PendingSlotEffect` interface is defined in `src/types/battle/battle.ts`. Each entry holds `{ move, side, targetSlot, turnsLeft, damage, sourceName? }`.
  - `damage` is pre-computed at cast time (15% of target's `maxHp`, minimum 10). It is stored in the effect, not re-computed on resolution.
  - The effect fires on the **Pokémon currently occupying `targetSlot`** on `side` when `turnsLeft` reaches 0 — regardless of which Pokémon was originally targeted. This matches official game behavior.
  - Do NOT add `futureSightTurns` or `futureSightDmg` to the `Pokemon` type — those fields have been removed.
  - `pendingSlotEffects` is ticked in `battleFlow.ts` during upkeep. `resetActiveBattleState` clears it to `[]` between battles.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Turn & Lifecycle Helper Decomposition**: Keep `battleTurn.ts` and `orchestrator.ts` strictly modular and under SRP limits by delegating turn choices/actions into `turnActionResolver.ts` and battle initialization sequences into `battleLifecycleInitializer.ts`.
- New Showdown log handlers go in the most specific sub-module; if none fits, add to `showdownBridgeMisc.ts` and refactor later.
- Keep `BattleArenaControls.vue` under 500 lines by extracting overlay logic into dedicated `*Overlay.vue` components.

## Verification

- Run `npm run test` — includes `struggle.spec.ts`, `pp_softlock.test.ts`, `faint_interrupts_log_playback.spec.ts`.
- Run `npm run audit:warnings-diff` for zero-error gate.

## Child DOX Index

- [actions/](./actions/AGENTS.md): Domain module documentation for actions.
- [ai/](./ai/AGENTS.md): Domain module documentation for ai.
- [engine/](./engine/AGENTS.md): Domain module documentation for engine.
- [helpers/](./helpers/AGENTS.md): Domain module documentation for helpers.
