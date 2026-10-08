# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Key Files

- `battleAnimationStateDispatcher.ts`: Module implementation.
- `battleHudStateHelper.ts`: Module implementation.
- `combatantStatusHelpers.ts`: Module implementation.
- `moveTooltipCalculator.ts`: Module implementation.
- `useBattleArenaCoordinator.ts`: Module implementation.
- `useBattleBackground.ts`: Module implementation.
- `useBattleCaptureAnimations.ts`: Module implementation.
- `useBattleMinigames.ts`: Module implementation.
- `useBattleSeats.ts`: Module implementation.
- `useBattleShadows.ts`: Module implementation.
- `useBattleTrainerAnimations.ts`: Module implementation.
- `useBattleTrainerVisuals.ts`: Module implementation.
- `useBattleTweenRegistry.ts`: Module implementation.
- `useBattleVisuals.ts`: Module implementation.
- `useBattleWildAnimations.ts`: Module implementation.
- `useCombatantStatus.ts`: Module implementation.
- `useMoveSlotData.ts`: Module implementation.
- `useMoveTooltip.ts`: Module implementation.
- [`battleAtmosphereHelpers.ts`](./battleAtmosphereHelpers.ts): Module implementation.
- [`useBattleAnimations.ts`](./useBattleAnimations.ts): Module implementation.
- [`useBattleAtmosphere.ts`](./useBattleAtmosphere.ts): Module implementation.
- [`useBattleCombatants.ts`](./useBattleCombatants.ts): Module implementation.
- [`useBattleHud.ts`](./useBattleHud.ts): Module implementation.
- [`useCombatCamera.ts`](./useCombatCamera.ts): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Seat Property Resolution Integrity**: `getSeatProperty` MUST strictly resolve slot properties via direct UID matching on entry and exit slots first, before falling back to active slot evaluation (`isActive ? seat.entry : seat.exit`). Implementing manual preference chains that check `seat.entry[prop]` for non-null values prior to fallback is strictly forbidden, as non-null default values (such as `'pokeball'`) will permanently shadow valid data stored in `seat.exit`.
- **Battle Atmosphere & Lighting Hierarchy (`useBattleAtmosphere.ts`, `battleAtmosphereHelpers.ts`)**: `useBattleAtmosphere.ts` is the single source of truth (SSoT) for arena lighting, weather particles, and CSS filters, delegating cycle calculations, field terrain priority, and ambient weather resolution to `battleAtmosphereHelpers.ts`. It checks explicit battle/gym config (`fixedCycle`, `fixedWeather`), explicit map config (`supportedCycles`, `weatherEnabled`), and falls back to inspecting available battle background asset variants (`getAvailableCyclesForMap`). Arenas with single sprites (like default Gyms and PvP) are locked to `'day'` lighting and clear weather unless configured with explicit overrides or an in-battle move/ability sets active combat weather.
- **Wild Encounter Silhouette Lifecycle & Clean Stage Transitions**: In `useBattleHud.ts` and `useBattleAnimations.ts`, wild encounters MUST evaluate and initialize in silhouette mode (`activeEnemyIsSilhouette = true`, `isWildSilhouette = true`, `silhouetteOpacity = 0`) across all setup and discovery phases (`CONTEXT_SETUP`, `INITIALIZING`, `SEARCH_PHASE`) before the first GSAP frame. If a wild encounter terminates prematurely from the search phase (fleeing or closing the modal before `ACTIVE_BATTLE`), the silhouette state MUST be preserved through cleanup to prevent 1-frame full-color reveals. Furthermore, `useBattleCombatants.ts` and `resolution.ts` (`terminateBattle`) MUST filter out defeated enemy combatants and clear `active.enemy` during `REWARDS_PHASE` and `EXIT_BATTLE` to guarantee clean sequential stage transitions.
- **Canonical Seat Allocation & The Golden Rule of Seats (`useBattleCombatants.ts`, `useBattleHud.ts`)**: In all battle setups, Seat 1 (Player) and Seat 2 (Enemy) are strictly and unconditionally empty during `CONTEXT_SETUP` and `INITIALIZING` (`playerCombatants = []`, `enemyCombatants = []`, `activeEnemyData = null`, `activeEnemyHudData = null`, `isEnemyHudSuppressed = true`, `isPlayerHudSuppressed = true`). For Wild encounters, Seat 2 is populated at `SEARCH_PHASE` (`PREPARATION`) so that `CombatGrass` (bushes), the silhouette shader, and the ground shadow render seamlessly before the emergence jump (`ENTRY_ANIM`). For NPC Trainer, Gym, and Rival encounters, Seat 2 remains strictly empty throughout `SEARCH_PHASE` and `FIRST_INTRO` until `POKEMON_CALL`. Under no circumstances should `useBattleHud.ts` fall back to `_initialEnemy` when `enemyRef` is null in trainer flows, preventing 1-frame leaks or premature rendering of Pokémon before trainer presentation completes. All seats are vacated strictly after faint, capture, or retreat animations finish 100%.
- **Combat Camera Viewport Coverage & Dynamic Zoom Clamping Mandate (`useCombatCamera.ts`)**: The battle arena camera MUST guarantee 100% viewport coverage across all aspect ratios (ultrawide, 16:9, vertical mobile) without ever exposing outside black bars or unrendered world space.
  1. *Dynamic Min-Zoom Computation*: `useCombatCamera` calculates the viewport coverage scale `coverScale = Math.max(camWidth / MAP_WIDTH, camHeight / MAP_HEIGHT) * 1.02` and derives `minZoom = Math.max(0.4, Math.min(1.0, Math.ceil((coverScale / baseScale) * 10) / 10))`.
  2. *Scale & Boundary Translation Clamping*: `currentScale` is strictly bounded by `Math.max(coverScale, baseScale * effectiveZoom)`. Translation offsets ($tx, ty$) are clamped within valid canvas boundaries: $tx \in [\min(0, \text{camWidth} - \text{MAP\_WIDTH} \times \text{currentScale}), 0]$ and $ty \in [\min(0, \text{camHeight} - \text{MAP\_HEIGHT} \times \text{currentScale}), 0]$.
  3. *UI Control Synchronicity*: `minZoom` is passed down to `CameraZoomControls.vue`, disabling the zoom-out `[-]` button when the maximum safe zoom-out is reached and clamping all manual zoom inputs.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
