# Purpose

Manage shared reactive application state using Pinia.

## Ownership

State Architects / Frontend Developers.

## Local Contracts

- Strict data sanitization when updating/switching entities: auto-complete up to 4 moves with STAB guarantee, deduplicate via `Set`, filter empty/invalid entries.
- Bypassing static browser alias loading (`@/`) in Node.js test runs using dynamic store loading.

## Work Guidance

- Zero serialization (`JSON.stringify`) in watch handlers to prevent severe CPU lag.
- Define explicit local type interfaces for mocks rather than using `any` (Zero-Any policy).
- Ensure explicit error propagation in dynamic imports (never silent `.catch(() => {})`).
- **Gender is a Save Property**: The player's gender (`'h'` | `'m'`) is set once at signup and persists in the save. Login flows MUST NEVER ask for gender — only signup/registration forms include the gender selector. Use separate components for login (no gender) and signup (with gender).
- When visual/state variables are modified, keep them atomic and fully initialized to prevent race conditions in HUD layers.
- **Save Shield (Zero-Pokemon Save Prohibition)**: It is strictly forbidden to save the game state (to IndexedDB, LocalStorage, OPFS, or Supabase) if the state contains 0 Pokémon (i.e. `team` and `box` are empty) OR if `starterChosen` is `false`. A valid active session must always have at least 1 Pokémon. Abort saving immediately if this condition is met.
- **No Runtime Sanitization Patches**: State loading or initialization hooks must not use dynamic patches to fix legacy identifiers at runtime. All data schema migrations must occur inside migration scripts.
- **isProcessing Gate Rule**: `isProcessing.value = true` MUST be set only after all synchronous and async pre-conditions that may abort the action have been evaluated. Setting it early (before a worker/network check that may reject the action) causes UI elements gated on `isProcessing` to flicker unnecessarily. Correct order: ① return early if already processing; ② await all blocking checks (e.g. `isPlayerTrappedInWorker()`); ③ abort with user notification if a check fails — **never touching `isProcessing`**; ④ only then set `isProcessing.value = true` and proceed.

## Verification

- Run `npm run lint` and `npm run audit:full`.
- Verify memory footprint and FPS stability during intense store updates.

## Child DOX Index

- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
- [game/](./game/AGENTS.md): Domain module documentation for game.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [social/](./social/AGENTS.md): Domain module documentation for social.
