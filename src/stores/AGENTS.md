# Purpose

Manage shared reactive application state using Pinia.

## Ownership

State Architects / Frontend Developers.

## Local Contracts

- Strict data sanitization when updating/switching entities: auto-complete up to 4 moves with STAB guarantee, deduplicate via `Set`, filter empty/invalid entries.
- Bypassing static browser alias loading (`@/`) in Node.js test runs using dynamic store loading.
- **Decoupled Event Awards & History State**: The event store (`useEventStore`) must independently track active scheduled events, multi-category user entries indexed by `(event_id, category_id)`, pending user awards per category, and past competition results (`competition_results`), ensuring that claiming an award updates both pending awards and completed competition items immediately without requiring an active event window.
- **Login Award Notifications**: `checkPendingAwards(notifyOnPending)` in `useEventStore` must accept an optional notification flag to cleanly emit toast alerts on initial game session mount (`MainGameView.vue`) without emitting duplicate toasts during background hourly ticks.
- **Illegal Pokémon Quarantine Across Reactive Stores**: Any Pokémon marked with `isIllegal: true` (or failing Showdown legality checks) MUST be strictly quarantined across all application stores:
  1. **PC Box & Transfers (`box.ts`)**: Moving or swapping an illegal Pokémon into the active combat `team` is strictly forbidden. Releasing it (`doBoxRelease`) is permitted as a **Pure Release** (removes the entity permanently without returning held items, money, or rewards). Selling to Team Rocket / Black Market (`doBoxRocketSell`) is blocked and yields $0 value.
  2. **Market & Trade (`useMarketPublishPokemon.ts`, `trade.ts`)**: Illegal Pokémon cannot be published on the Market / GTS or offered in P2P trade requests.
  3. **Daycare & Breeding (`breeding.ts`, `daycareMissions.ts`)**: Illegal Pokémon cannot be deposited into Daycare slots, used in breeding algorithms, or counted towards daycare/event mission goals.
  4. **PvP & War Teams (`teamActions.ts`)**: Illegal Pokémon must be excluded from `autoFillPvpTeam`, `autoFillWarTeam`, and manual slot swaps.
- **Busy Pokémon Protection & Complete Lifecycle Mandate**: Any Pokémon engaged in active deployments (`onMission: true`), competition events (`onEvent: true`), daycare deposit (`inDaycare: true`), or passive defense (`onDefense: true`) is classified as busy (`isPokemonBusy`). Stores and actions MUST strictly enforce:
  1. **PC Box & Transfers (`box.ts`)**: Busy Pokémon cannot be selected for release (`doBoxRelease` skips them) or Team Rocket Black Market sale (`doBoxRocketSell` yields $0 and counts 0). Moving or swapping them into the active team is rejected.
  2. **P2P Trade & GTS Market (`trade.ts`, `gts.ts`)**: Offering or publishing busy Pokémon is rejected locally and on backend RPC emulations (`tradeRpc.ts`, `marketRpc.ts`).
  3. **Automatic Lifecycle Rehabilitation**: When mission rewards are collected (`playerClass.ts`), events conclude and sync (`events.ts`), or event awards are claimed (`claimAward`) or discarded (`discardAward`), busy flags MUST be cleared (`onMission = false`, `onEvent = false`) via pure deterministic recovery logic (`healStuckEventPokemon`), removing badges and immediately restoring full trading, selling, releasing, and team movement abilities.
- **Real-Time Environment Ticker & Simulation Freeze Protocol**:
  The map store (`useMapStore`) must sample server epoch time via a lightweight GSAP ticker every 10s of game time, dynamically updating `currentEpochHour`, `currentCycle` (day/dusk/night), and map weather for live players. To ensure deterministic execution during automated E2E simulations, fuzzer runs, and certified replays, the ticker must support instantaneous freezing via `setFreezeClock(true)` and fixed environment override via `window.__VITE_DEBUG__.setFixedTime(...)`.
- **Reactive O(1) State Indexing**: Persistent state arrays (`team`, `box`, `inventory`, `pokedex`) retain their serializable database contracts, while fast entity lookups MUST be exposed via reactive computed getters (`pokemonByUid: computed<ReadonlyMap<string, ...>>`, `caughtSpeciesSet`, `seenSpeciesSet`) guaranteeing $O(1)$ queries without modifying underlying SQL/Supabase schemas.
- **Mandatory Reactive Getters for Secondary Stores (No Stale Duplicate State)**: Secondary Pinia stores (`gymsStore`, `daycareMissionsStore`, etc.) MUST NOT duplicate persistence arrays in local state that rely on view-level lifecycle hooks (e.g., `loadGymProgress()` in `onMounted`) to become populated. All derived state MUST be implemented as reactive Pinia getters querying `gameStore.state` directly, ensuring instant $O(1)$ synchronization on page refresh across all views.
- **Debug Mode Daycare & Unreleased Species Compatibility**: In debug mode or local sandbox instances (`window.__VITE_DEBUG__`), Daycare deposit (`breeding.ts`), egg generation (`checkAndGenerateEgg`), and egg hatching actions (`executeHatch` in `breedingActions.ts`) MUST accept and process unreleased Pokémon species, propagating `bypassWhitelist: true` across `makePokemon` and `recalcPokemonStats`.

## Work Guidance

- Zero serialization (`JSON.stringify`) in watch handlers to prevent severe CPU lag.
- Define explicit local type interfaces for mocks rather than using `any` (Zero-Any policy).
- Ensure explicit error propagation in dynamic imports (never silent `.catch(() => {})`).
- **Gender is a Save Property**: The player's gender (`'h'` | `'m'`) is set once at signup and persists in the save. Login flows MUST NEVER ask for gender — only signup/registration forms include the gender selector. Use separate components for login (no gender) and signup (with gender).
- When visual/state variables are modified, keep them atomic and fully initialized to prevent race conditions in HUD layers.
- **Save Shield (Zero-Pokemon Save Prohibition)**: It is strictly forbidden to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`. A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.
- **No Runtime Sanitization Patches**: State loading or initialization hooks must not use dynamic patches to fix legacy identifiers at runtime. All data schema migrations must occur inside migration scripts.
- **isProcessing Gate Rule**: `isProcessing.value = true` MUST be set only after all synchronous and async pre-conditions that may abort the action have been evaluated. Setting it early (before a worker/network check that may reject the action) causes UI elements gated on `isProcessing` to flicker unnecessarily. Correct order: ① return early if already processing; ② await all blocking checks (e.g. `isPlayerTrappedInWorker()`); ③ abort with user notification if a check fails — **never touching `isProcessing`**; ④ only then set `isProcessing.value = true` and proceed.
- **State Corruption Detection & Loud Self-Healing**: When loading or reading persisted arrays and sub-entities (such as daycare missions, eggs, or inventories) that may contain legacy or malformed items lacking mandatory properties:
  1. Never introduce silent runtime fallbacks inside UI components.
  2. The store MUST validate entity completeness (e.g. via an `isValid<Entity>` guard).
  3. When corrupted data is detected, the store MUST log an error loudly via `logger.error(...)` and immediately self-heal by regenerating clean, valid domain objects and scheduling a save.
- **Store Action Decomposition & Sub-Directory DOX Registration**:
  - When Pinia stores exceed the 500 LOC threshold, their business actions should be decomposed into dedicated domain action modules under a subdirectory (e.g. `src/stores/events/eventEnrollmentActions.ts` and `src/stores/events/eventAwardsActions.ts`).
  - Any newly created actions subdirectory under `src/stores/` MUST contain its own mandatory `AGENTS.md` file and be linked under the `## Child DOX Index` of `src/stores/AGENTS.md`.

## Verification

- Run `npm run audit` to verify store types, state consistency, and project rules.
- Verify memory footprint and FPS stability during intense store updates.

## Child DOX Index

- [auth/](./auth/AGENTS.md): Domain module documentation for auth store helpers.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
- [events/](./events/AGENTS.md): Domain module documentation for events store actions.
- [game/](./game/AGENTS.md): Domain module documentation for game.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [social/](./social/AGENTS.md): Domain module documentation for social.
