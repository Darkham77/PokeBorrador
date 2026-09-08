# Game Engine, Visuals & State Rules

> **Scope & Authority**: This document governs **high-level engine invariants, Showdown integration boundaries, 4-seat generic design, UID team synchronization, visual shell rules, and illegal Pokémon quarantine** across Poké Vicio.
>
> 🛑 **Anti-Catch-All & Subsystem Redirection**:
> - **DO NOT ADD GAMEPLAY SUBSYSTEM RULES HERE.** Specific gameplay features, drop tables, daycare/breeding mechanics, items, and gyms belong in their respective dedicated manuals:
>   - For Daycare, Breeding, Hatching, Egg limits, and Baby rewards ➔ [Breeding Manual](../systems/breeding_manual.md).
>   - For Gyms, Badges, and Leaders ➔ [Gym System Manual](../systems/gym_system_manual.md).
>   - For Items, Crafting, and Medicine ➔ [Item System Manual](../systems/item_system_manual.md).
>   - For Faction War mechanics ➔ [Faction War Manual](../systems/war_system_manual.md).
>   - For Battle engine mechanics, choice loops, and worker turn resolution ➔ [Battle Mechanics Manual](../battle/battle_mechanics_manual.md).
>   - For Mathematical formulas (damage, catch rates, stats, escape) ➔ [Game Formulas Manual](../core/game_formulas_manual.md).
>   - For Combat animations and GSAP timelines ➔ [Animation Standards](../battle/animation_standards.md).
>   - For In-flight combat save persistence and F5 anti-cheat ➔ [Battle Persistence & Anti-Cheat Manual](../battle/battle_persistence_and_anti_cheat_manual.md).

---

## 1. Showdown Source of Truth & Move Execution SSoT

- **Source Code Reference**: The local directory `external/pokemon-showdown-code/` contains the official Pokémon Showdown source code (`https://github.com/pkmn/ps.git`) and MUST be used as the canonical source of truth for algorithms, battle engine logic, and state transitions.
- **Single Source of Truth for Move Execution**: The Pokémon Showdown Web Worker engine (`showdown.worker.ts` via `@pkmn/sim`) handles 100% of battle math, damage calculations, accuracy checks, stat boosts, weather effects, terrain, entry hazards, and abilities. Dual-engine calculations and manual hazard/ability handlers in client code (such as legacy `moveExecutor` or custom switch actions) are strictly prohibited.
- **Active Generation SSoT**: It is STRICTLY FORBIDDEN to hardcode the Pokémon Showdown generation (`genX`, `gen5`, etc.) anywhere in the codebase. All battle initializations and formats MUST dynamically reference `ACTIVE_GENERATION` (e.g. `gen${ACTIVE_GENERATION}customgame` or `getShowdownFormatId()`).
- **Competitive Trainer Team Generation SSoT**: All NPC, police, and rival encounter teams MUST be generated through `TrainerTeamGenerator` or `RivalTeamGenerator` (`src/logic/battle/rivalTeamGenerator.ts`). The generator configures `@pkmn/randoms` using `gen${ACTIVE_GENERATION}randombattle@@@Adjust Level = ${level}, Max Team Size = ${teamSize}` restricted strictly to `allowedSpecies`. For Dexit species, movesets cascade downwards across previous generations; for unevolved (NFE) species, legal moves are synthesized from `getMovesAtLevel`. Rival teams enforce guaranteed Ace placement in slot 0 and difficulty scaling of player average level + 5 (clamped to `MAX_POKEMON_LEVEL`).
- **Final-Turn Double Faint Victory Guard**: When a simultaneous KO occurs on the final turn of combat (e.g. Explosion, recoil, or Destiny Bond), `processPlayerFaintSequence` MUST verify whether all opponent Pokémon are fainted (`active.over || !enemyHasHealthy`). If the opponent has no healthy Pokémon left, combat MUST terminate immediately with victory (`terminateBattle(ctx, true)`) and automatically swap to the next healthy bench Pokémon via `animatePlayerAutoSwap` rather than forcing the player into `SWITCH_MENU`.
- **Battle Mechanics & Engine Protocol SSoT**: All battle mechanics, worker synchronization protocols, choice loop resolution, recharge handling, and FSM transition matrices are documented strictly and exclusively in the [Battle Mechanics Manual](../battle/battle_mechanics_manual.md).

## 2. Zero-Timer & GSAP Clock Mandate

- **Prohibition on Native Timers**: Native `sleep(...)` and `setTimeout(...)` / `setInterval(...)` are strictly forbidden across `src/`.
- **GSAP Clock Standard**: All animations, pauses, delays, and state transition intervals (such as defeat screens, stage stabilization, and catch sequences) MUST be driven exclusively by the GSAP timeline clock (`gsapSleep` from `@/logic/utils/gsapHelpers` or `ctx.animations.awaitTween(...)`).
- **Deterministic Time-Scaling**: Using GSAP clock primitives guarantees perfect scaling with `gsap.globalTimeline.timeScale(...)` in automated simulations and headless replays (instantaneous execution) while maintaining smooth 1x visual playback for human players.

## 3. UID Parity & Real-Time Team Synchronization

- **Instantaneous Combatant Synchronization**: Every combatant HP update, status change, or faint event (`-damage`, `-heal`, `faint`, `-status`, `-curestatus`, `-sethp`) is instantaneously synchronized to the team arrays (`activeBattle.playerTeam`, `activeBattle.enemyTeam`, `gs.state.team`) via `syncCombatantToTeam`.
- **No Pokémon Object Cloning**: It is STRICTLY FORBIDDEN to clone, shallow-copy (`{ ... }`), or replace Pokémon instances representing active combatants or team members to trigger Vue reactivity updates. Doing so breaks object reference parity.
- **UID-Based Resolution & In-Place Mutation**: Always pass unique identifiers (`uid`) and resolve objects dynamically via getters from the primary SSoT (`gameStore.state.team` or `gameStore.state.box`). Mutate object properties directly in-place on references.

## 4. Mandatory 4-Seat Generic Compatibility Mandate

- Every battle orchestration, state synchronization, worker payload processing, and UI component MUST be strictly designed, modularized, and generalized to support up to 4 battle seats (`p1`, `p2`, `p3`, `p4`) dynamically.
- Hardcoding logic, branches, or state variables for only 2 seats (`p1`/`p2`) is STRICTLY FORBIDDEN. Refactor seat logic into parameterized loops without code duplication.

## 5. Visual Shell, SASS Integrity & Game Performance

- **SASS Integrity**: SASS function capitalization is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build. Developers and agents write standard lowercase CSS filters/transforms, and Vite automatically formats them.
- **GPU Efficiency & Performance**: High-fidelity web video game requirement. All UI and logic implementations MUST prioritize GPU-accelerated rendering and FPS stability. Strict use of Texture Atlases, Object Pooling, layer promotion (`will-change: transform`), and filter chain optimizations (`pokemon-outline-performance`).
- **GBA Font Spanish Capitalization Constraint**: The primary pixel font lacks uppercase glyphs for 'Ñ' and accented vowels. Any uppercase conversion in the UI (e.g. move names) must preserve or convert these characters to their lowercase equivalents (replacing 'Ñ' with 'ñ') to ensure they render correctly.

## 6. Entity Identifier Formatting Rules

- **English Identifier Mandate**: Logical identifiers (`id`) for items, Pokémon, abilities, natures, moves, etc., MUST be strictly in English (using official Showdown format). Spanish is reserved exclusively for user-facing UI text.
- **Showdown ID Format**: All identifiers MUST be all lowercase, alphanumeric characters only (no spaces, no hyphens, no underscores). Correct non-conforming IDs across configs, code, and databases immediately upon discovery.
- **Showdown Healthy Status Semantics**: An unafflicted Pokémon's status condition is represented strictly as an empty string `''` (never `null`). Status clearance and condition evaluations across engine, items, and UI logic MUST check `Boolean(pokemon.status)` to avoid falsely evaluating healthy Pokémon as afflicted.

## 7. Movepool & Learnset Legality Standards

- **Level-Aware Learnset Validation**: Move legality checks (`canLearnMove`) and random move generation (`getRandomLegalMoves`) must resolve sources dynamically via Showdown's `Dex.data.Learnsets`. Level-up moves (`L`) are only legal if `learnLevel <= currentLevel`. Non-level sources (`M`, `E`, `T`, `S`, `D`, `V`) are legal across all levels (1-100).
- **Empty Slot Handling on Constrained Species**: When generating legal random moves for species with fewer available moves than the requested slot count (e.g. Unown with 1 move, Cosmog with 2 moves), extra move slots MUST be padded with `null` rather than duplicating moves or synthesizing illegal moves.
- **Loud Rejection in Debug Panels**: Entity generators and battle simulators in debug mode MUST loudly block creation or combat if a Pokémon's movepool or attributes violate legality rules.

## 8. Strict Illegal Pokémon Lifecycle & System Quarantine

- **The Only Two Valid Paths**: When a Pokémon is identified as illegal (`isIllegal: true` or failing Showdown legality verification), only two actions are permitted:
  1. **Pure Release**: The player may release the Pokémon from storage. This deletion is pure and irreversible: NO currency, NO experience, NO rewards, and NO held items are returned to inventory.
  2. **Administrative Repair**: An administrator executes diagnostic repair tools (`repairPokemon` / `repairAllIllegal`) to clamp moves, abilities, and stats to Gen-compliant Showdown learnset boundaries.
- **Total System Prohibition**: All other game activities involving illegal Pokémon are strictly prohibited:
  - **Trading & Selling**: Prohibited from P2P trade, Market/GTS publishing, and Team Rocket / Black Market sales ($0 value).
  - **Breeding & Daycare**: Prohibited from Daycare deposits, breeding inheritance, and expedition mission fulfillment.
  - **Combat**: Prohibited from joining active battle teams, Arena PvP lineups, Faction War rosters, and triggering any battle sequence.

## 9. Atomic Combatant Replacement & Intro Sequencing

- **Atomic Replacement & Sendout Invariant**: When an active combatant faints in trainer battles, setting the new active combatant reference, emitting the sendout announcement log (`"¡${trainerName} envía a ${nextEnemy.name}!"`), and awaiting `handleReleaseRequest` MUST execute atomically inside `POKEMON_CALL` $\rightarrow$ `RENDER_BALL` $\rightarrow$ `OCCUPY_SEAT` before dispatching choices to Showdown. Never rely on worker client side-effects to trigger UI logs or release animations.
- **Trainer Intro Sequence**: Trainer encounters strictly log the trainer challenge during `TRAINER_ENCOUNTER` while `enemyCombatants` is empty, animate trainer retreat during `RETREAT_AND_FADEOUT`, and announce the Pokémon sendout during `POKEMON_CALL`.

## 10. Map & Gym Atmosphere Configuration, Cycle Resolution & Climate Isolation

- **Atmosphere & Lighting Resolution Hierarchy**: Combat lighting (`effectiveCycle`) and climate (`computedWeather`) are evaluated under a strict precedence order:
  1. **Explicit Battle & Gym Config**: If `fixedCycle` (e.g. permanent night for a Ghost Gym) or `fixedWeather` is configured in `BattleOptions` or `Gym` (`GYMS`), it takes absolute priority.
  2. **Explicit Map Location Config**: If `MapLocation` specifies `supportedCycles` or `weatherEnabled: false`, it applies directly.
  3. **Default Single-Sprite & Gym Isolation**: If no explicit cycle is configured, single-sprite arenas (`gym`, `pvp`, `power_plant`) enforce constant daylight/neutral lighting (`effectiveCycle = 'day'`) and block natural outdoor weather (`computedWeather = 'clear'`).
  4. **Dynamic Multi-Sprite Resolution**: Locations with multi-cycle sprites (`_amanecer`, `_dia`, `_atardecer`, `_noche`) reactively adapt to the current time of day according to their available cycle sprites.
- **In-Combat Weather Exclusivity**: Weather inside gyms and weather-sealed arenas is enabled whenever an in-battle move (*Rain Dance*, *Sunny Day*, *Hail*, *Sandstorm*) or ability (*Drizzle*, *Drought*, *Snow Warning*, *Sand Stream*) actively casts it (`battle.weather.type !== 'none' && battle.weather.type !== 'clear'`). Upon expiration, the arena cleanly reverts to its configured base atmosphere.

## 11. Unified Out-of-Battle Rule Coordinator & Field Passives Mandate

- **Zero-Hardcoding Out-of-Battle Rule Coordination**: All outside-battle rule modifications, Pokémon field passives, item buffs/debuffs (incenses, repels, tools, charms), player class perks, Daycare modifiers, and event multipliers MUST be aggregated and evaluated through the centralized `FieldRulesCoordinator` (`src/logic/rules/fieldRulesCoordinator.ts`). Writing disparate, ad-hoc `if (leader.ability === ...)` or item checks scattered across low-level subsystem files is STRICTLY FORBIDDEN.
- **Canonical Out-of-Battle Abilities**: All 33 canonical field abilities are implemented in `pokemonFieldAbilities.ts` and scale dynamically with `ACTIVE_GENERATION`. Egg step reduction passives (*Flame Body*, *Magma Armor*, *Steam Engine*) provide a non-stacking $2\times$ reduction, while post-battle gathering (*Pickup*, *Honey Gather*) rolls independently per conscious party member according to official level brackets.


## 12. Busy Pokémon Protection & Complete Lifecycle Protocol

Pokémon participating in active missions (`onMission: true`), competition events (`onEvent: true`), daycare (`inDaycare: true`), or passive defense (`onDefense: true`) are classified as busy (`isPokemonBusy`):
1. **Visual Indicators**: Automatically badged with `mission` (`🧭 EN MISIÓN`) or `event` (`🏆 EN EVENTO`) via `getPokemonVisualBadges()`.
2. **Action Locking**: Release, Black Market selling, P2P trade offers, and GTS publishing are strictly blocked across UI, Pinia stores, and database RPCs.
3. **Lifecycle Rehabilitation & Orphan Event Liberation**: Once a mission is claimed, an event concludes, or event awards are claimed (`claimAward`) or discarded (`discardAward`), all busy flags MUST be reset to `false` via `healStuckEventPokemon`. If a Pokémon remains marked with `onEvent` from an archived, legacy, or concluded event, `fetchEvents` and `validateAll` automatically self-heal and liberate the Pokémon across Team, Box, and Daycare Warehouse.

## 13. Species Evolution Whitelist Boundary

- **Evolution Legality Clamping**: The auto-evolution engine (`getEvolvedForm` in `src/logic/evolution/evolutionLogic.ts`), wild encounter scalers, and trainer team generators MUST strictly clamp evolutions within the active `ENABLED_POKEMON_IDS` whitelist (`isEnabledPokemonId`).
- **Prohibition on Unreleased Evolutions**: Generating or evolving Pokémon into unreleased generations (e.g. Magnemite evolving into Gen 4 Magnezone when only Gen 1-2 are active) in standard gameplay or difficulty scaling is strictly prohibited. Eliminating `bypassWhitelist` is mandatory across all gameplay combat and encounter paths.

## 14. Deterministic Physical Dimensions & Special Forms (Weight 0 kg Protection)

- **Mandatory Instance Dimensions**: All Pokémon instances created via `makePokemon` MUST possess deterministic, non-zero physical dimensions (`height` in meters and `weight` in kilograms) stored directly on the entity.
- **Gigamax & 0 kg Base Species Fallback**: When querying base dimensions from Showdown for special forms (such as Gigamax species like `eeveegmax`, where Showdown canonical data sets `weightkg: 0`), data providers (`pokemonDataProvider.getPokemonData`) and dimension generators MUST fall back to the base species (`species.baseSpecies`) and enforce a positive non-zero floor (`0.1`), strictly forbidding 0.0 kg/m entities from entering active teams, boxes, or competition leaderboards.

## 15. Storage Capacity Pre-Flight Validation for Reward Grantors

- **Pre-Flight Storage Guard**: Any system, modal, or action granting Pokémon rewards (competition awards, daycare baby rewards, mystery gifts, battle rewards) MUST validate storage capacity BEFORE attempting to generate or grant Pokémon.
- **Capacity Formula**: If the player's total occupied slots (`team.length + box.length`) plus incoming Pokémon count exceeds maximum capacity (`6 + (boxCount || 4) * 50`), the operation MUST fail-fast with a descriptive warning, preventing box overflow and data corruption.

## 16. Mandatory Zero Battle Duplication & Canonical Combat Engine SSoT

- **Unified Turn Execution**: All combat encounters regardless of game mode MUST delegate their turn resolution to the canonical turn runner `executeCanonicalTurn` (`src/logic/battle/helpers/canonicalTurnRunner.ts`). The runner is the authoritative orchestrator for dispatching worker messages to `@pkmn/sim`, advancing the FSM through `BUILD_QUEUE` -> `POP_ACTION` -> `APPLY_MOVE` -> `EVAL_HP`, parsing GSAP animation logs, synchronizing team HP snapshots, and evaluating post-turn faints/switches.
- **BattleSession Hierarchy (Strategy Pattern)**: Divergent mode-specific lifecycles MUST NOT inject scattering `if (isPvP)` / `if (isGym)` checks into core battle loops. Instead, combat orchestration delegates to polymorphic session subclasses (`BaseBattleSession` -> `PvEBattleSession`, `GymBattleSession`, `PvPBattleSession`, `SpectatorBattleSession`, `ReplayBattleSession`) instantiated through `BattleSessionFactory`.
- **Declarative UI Parameterization**: Mode-specific UI features (PvP turn clocks, spectator banners, replay playback controls, bag locks, forfeit buttons, gym leader dialogue) MUST be driven exclusively by `BattleUiConfig` (`createBattleUiConfig(mode, overrides)`). Duplicating arena components or creating mode-specific arenas is strictly prohibited.
- **Universal Switch Modals**: Voluntary switches and forced faint replacement switches in all modes MUST reuse the universal `PokemonSelectionModal` with `isBattleSwitch: true` and `preventClose: true`, as well as the in-arena `BattleQuickTeam` bench panel.

## 17. Mandatory Centralized Asset Management SSoT (`getAssetUrl`)

- **Single Source of Truth for Visual Assets**: All visual assets across the entire application—including Pokémon sprites, trainer sprites, inventory/shop items, maps, UI icons, banners, gym badges, battle backgrounds, and ranked medals—MUST be resolved strictly and exclusively through `getAssetUrl(ASSET_TYPES.<CATEGORY>, id, options)` from `@/logic/services/assetService`.
- **Absolute Prohibition on Hardcoded Path Strings**: Directly hardcoding asset paths (e.g. `'/assets/...'`, `'/sprites/...'`, or relative asset paths) in Vue component templates, CSS/SCSS styles, Pinia stores, or static configuration files (`src/data/`) is STRICTLY FORBIDDEN.
- **Static Catalogs Store Domain IDs Only**: Static datasets (`src/data/`) must only store canonical domain identifiers (`ItemId`, `PokemonSpeciesId`, `GymId`, `RankedTierId`, `NpcSpriteId`). Path construction and routing logic is the exclusive responsibility of `assetService.ts`.
- **Strict Domain Overload Requirement**: Any new asset category added to `ASSET_TYPES` MUST be equipped with a corresponding strictly typed function overload in `assetService.ts` mapping the category to its canonical domain type union.

## 18. Pokémon Instance Invariant: Capture Timestamp & Method Integrity

- **Mandatory Instance Invariant**: Every Pokémon instance across all stages of gameplay—including wild captures, starter selection, breeding hatches, event awards, GTS market claims, trade exchanges, and debug test fixtures—MUST possess a valid numeric timestamp `obtainedAt: number` (epoch milliseconds) and a canonical `obtainedMethod: ObtainedMethod` (`'wild' | 'trade' | 'egg' | 'starter' | 'gift' | 'fishing' | 'archaeology' | 'gift_starter' | 'reward' | 'event'`).
- **Defensive Ingestion Guarantees**: Any ingest boundary adding Pokémon to the player state (`addPokemon`, `claimAsset`, `emulateClaimAsset`) MUST verify and populate missing timestamps with current server epoch time (`Temporal.Now.instant().epochMilliseconds`) and assign `'reward'` as fallback method, preventing `'SIN FECHA'` UI states without requiring database migrations.
- **Debug Fixture Parity**: Debug simulators and mock generators MUST never instantiate incomplete Pokémon object literals lacking capture metadata.
