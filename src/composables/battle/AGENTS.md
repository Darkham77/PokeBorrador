# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Seat Property Resolution Integrity**: `getSeatProperty` MUST strictly resolve slot properties via direct UID matching on entry and exit slots first, before falling back to active slot evaluation (`isActive ? seat.entry : seat.exit`). Implementing manual preference chains that check `seat.entry[prop]` for non-null values prior to fallback is strictly forbidden, as non-null default values (such as `'pokeball'`) will permanently shadow valid data stored in `seat.exit`.
- **Battle Atmosphere & Lighting Hierarchy**: `useBattleAtmosphere.ts` is the single source of truth (SSoT) for arena lighting, weather particles, and CSS filters. It checks explicit battle/gym config (`fixedCycle`, `fixedWeather`), explicit map config (`supportedCycles`, `weatherEnabled`), and falls back to inspecting available battle background asset variants (`getAvailableCyclesForMap`). Arenas with single sprites (like default Gyms and PvP) are locked to `'day'` lighting and clear weather unless configured with explicit overrides or an in-battle move/ability sets active combat weather.
- **Wild Encounter Silhouette Lifecycle & Clean Stage Transitions**: In `useBattleHud.ts` and `useBattleAnimations.ts`, wild encounters MUST evaluate and initialize in silhouette mode (`activeEnemyIsSilhouette = true`, `isWildSilhouette = true`, `silhouetteOpacity = 0`) across all setup and discovery phases (`CONTEXT_SETUP`, `INITIALIZING`, `SEARCH_PHASE`) before the first GSAP frame. If a wild encounter terminates prematurely from the search phase (fleeing or closing the modal before `ACTIVE_BATTLE`), the silhouette state MUST be preserved through cleanup to prevent 1-frame full-color reveals. Furthermore, `useBattleCombatants.ts` and `resolution.ts` (`terminateBattle`) MUST filter out defeated enemy combatants and clear `active.enemy` during `REWARDS_PHASE` and `EXIT_BATTLE` to guarantee clean sequential stage transitions.
- **Immutable Seat 2 Vacating & HUD Suppression Mandate (`useBattleCombatants.ts`, `useBattleHud.ts`)**: In all battle setups, Seat 1 (Player) and Seat 2 (Enemy) are strictly and unconditionally empty during `CONTEXT_SETUP` and `INITIALIZING` (`playerCombatants = []`, `enemyCombatants = []`, `activeEnemyData = null`, `activeEnemyHudData = null`, `isEnemyHudSuppressed = true`, `isPlayerHudSuppressed = true`). For NPC Trainer, Gym, and Rival encounters, Seat 2 remains strictly empty throughout `SEARCH_PHASE` and `FIRST_INTRO` until `POKEMON_CALL`. Under no circumstances should `useBattleHud.ts` fall back to `_initialEnemy` when `enemyRef` is null, preventing 1-frame leaks or premature rendering of Pokémon before trainer presentation or search completes.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
