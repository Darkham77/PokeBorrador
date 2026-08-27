# Game Engine, Visuals & State Rules

> **Scope & Authority**: This document governs **high-level engine invariants, Showdown integration boundaries, 4-seat generic design, UID team synchronization, visual shell rules, and illegal Pokémon quarantine** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For detailed battle engine mechanics, choice loops, and worker turn resolution ➔ See [Battle Mechanics Manual](../battle/battle_mechanics_manual.md).
> - For mathematical formulas (damage, catch rates, stats, escape) ➔ See [Game Formulas Manual](../core/game_formulas_manual.md).
> - For combat animations and GSAP timelines ➔ See [Animation Standards](../battle/animation_standards.md).
> - For in-flight combat save persistence and F5 anti-cheat ➔ See [Battle Persistence & Anti-Cheat Manual](../battle/battle_persistence_and_anti_cheat_manual.md).

---

## 1. Showdown Source of Truth & Move Execution SSoT

- **Source Code Reference**: The local directory `external/pokemon-showdown-code/` contains the official Pokémon Showdown source code (`https://github.com/pkmn/ps.git`) and MUST be used as the canonical source of truth for algorithms, battle engine logic, and state transitions.
- **Single Source of Truth for Move Execution**: The Pokémon Showdown Web Worker engine (`showdown.worker.ts` via `@pkmn/sim`) handles 100% of battle math, damage calculations, accuracy checks, stat boosts, weather effects, terrain, entry hazards, and abilities. Dual-engine calculations and manual hazard/ability handlers in client code (such as legacy `moveExecutor` or custom switch actions) are strictly prohibited.
- **Active Generation SSoT**: It is STRICTLY FORBIDDEN to hardcode the Pokémon Showdown generation (`genX`, `gen5`, etc.) anywhere in the codebase. All battle initializations and formats MUST dynamically reference `ACTIVE_GENERATION` (e.g. `gen${ACTIVE_GENERATION}customgame` or `getShowdownFormatId()`).
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

