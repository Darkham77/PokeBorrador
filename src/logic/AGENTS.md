# Purpose

Manage the core mechanics, math formulas, data translations, and routing of the Poké Vicio project.

## Ownership

Logic Developers / Game Designers.

## Local Contracts

- DBRouter-enforced isolation between online (Supabase) and offline (SQLite) data.
- Complete separation of calculations from visual code (Pure Modules Pattern).
- **Asset ID Immutability**: Asset/item IDs MUST pass through the system without transformation (no `.toLowerCase()`, `.replace(/_/g, '')`). The asset service resolves by exact ID. If an ID arrives malformed, throw an explicit `Error`.
- **No Silent Fallbacks**: In capture/combat animations requiring a valid asset ID (e.g., Pokéball), hardcoded fallbacks (`ballId = 'pokeball'`) are STRICTLY FORBIDDEN. Always throw a descriptive `Error` so the root cause is visible.
- **Thread-safe Worker Messages**: Always use `addEventListener` / `removeEventListener` when communicating asynchronously with `showdownWorker`. Direct `onmessage` assignment overrides are strictly prohibited as they destroy concurrent event handlers and cause race conditions. For test runner mock compatibility (where `addEventListener` might be missing), provide a fallback check: `if (showdownWorker.addEventListener) { ... } else { showdownWorker.onmessage = handler }`.
- **Multi-seat 2vs2 Layout Mapping**: When parsing Showdown logs or resolving active combatants in `showdownBridge`, never assume there is only one active seat (`player` / `enemy`). Support the 4-seat architecture (up to 2 active seats per side, e.g., `player`, `player2`, `ally`, `enemy`, `enemy2`). Lookups MUST dynamically scan all active seat keys on the battle state to return the correct reactive seat instance, preventing state desynchronization.
- **Showdown Trapping Mechanics**: In Gen 4 / customgame formats without Team Preview, Showdown's `activeRequest` does not set `trapped: true` for Arena Trap/Shadow Tag. Instead, it sets `maybeTrapped: true`. Client-side trapping checks must verify both `trapped` and `maybeTrapped`.
- **Disabled Move NPC AI Checks**: The enemy AI decision-making logic (`decideEnemyMove`) must filter out any moves that match `enemy.disabledMove` (e.g., from Disable or Cursed Body) to prevent selecting disabled moves and crashing the battle engine with `INVALID_CHOICE`. The client state `disabledMove` is kept in sync via `-start|disable` / `-end|disable` parsing in `showdownBridgeField.ts`.
- **@pkmn/sim Internal Type Access Pattern**: Never define an interface that mirrors `@pkmn/sim`'s internal `Side` or `Pokemon` types exactly — they contain branded types and union variants (e.g. `trapped: boolean | "hidden"`) that cause irreconcilable type conflicts. Instead: ① define a minimal structural interface with only the fields your code reads, using the broadest compatible type; ② cast at the call site with `as unknown as YourInterface`. For one-off field accesses, use an inline cast: `(x as unknown as { active?: ... })`.
- **TypeScript Narrowing in Async Callbacks**: TypeScript's control-flow analysis does not narrow module-level `let` variables inside `new Promise(...)` callbacks, even when a null-guard runs immediately before the `new Promise` call. To satisfy strict null-checks, capture the variable into a `const` at the top of the callback: `const worker = showdownWorker!` — the `!` is safe because the outer guard already returned.
- **Showdown Team Order Synchronization**: The simulator's internal side state (`side.pokemon`) dynamically shifts the active Pokémon to index 0. Therefore, all pre-turn state synchronization (HP and statuses) MUST map values using `resolveCurrentTeamOrder` (active-swapped order) to match the simulator's active-first slot, while choice actions (like forced replacement switches) MUST resolve simulator slot numbers using the static original team order.

## Work Guidance

- Core mathematical calculations (battle stats, catch rates, damage, time cycles) must be extracted into pure TS files (*Math.ts) with zero dependency on Vue, Pinia, or Supabase.
- Avoid using legacy `Date` for engine calculations; use Node.js 26+ `Temporal` API.
- Use explicit `.ts` extensions for relative imports in Node.js utility contexts.
- Localize altered statuses in combat using the central Spanish `STATUS_NAME_MAP` translation dictionary.
- All check logic on equipped items must use English IDs (`exp_share`, etc.); Spanish translations are strictly for UI presentation.
- When writing UI conditionals on database models (e.g., war factions), compare against official DB values in Spanish (`'poder'`, not `'power'`).
- Decouple components using `GameBus` signals rather than tight dependencies.
- **Trainer Archetype SSoT**: All archetype definitions (name, sprite, pool, key) live exclusively in `src/data/trainerTypes.ts`. Derive keys via `Object.keys(TRAINER_TYPES)` — never maintain a local copy.
- **Move Description Fallback Chain**: Spanish move translations MUST follow: ① `pokemonDataProvider` → ② `move_descriptions.json` → ③ Showdown `shortDesc`. No English leaks.
- **Struggle Choice Resolution**: In `@pkmn/sim` battles, when all move PP is depleted, pass `'default'` as the choice to execute native Struggle.
- **Double KO Sequence Order**: In Double KO scenarios, always trigger and await the enemy's faint animation before the player's faint sequence to prevent premature FSM exits and UI animation cutoffs.
- **Showdown Team Preview Format Constraint**: When configuring native `@pkmn/sim` battles, the `!Team Preview` rule filter must only be appended for Gen 5+ formats. Appending it for Gen 1-4 throws a fatal simulator rule error because Team Preview does not exist in those generations.
- **Map Eligibility Centralization**: When a boolean condition about a map location is needed in ≥2 places, centralize it in a pure helper in `src/logic/map/` instead of duplicating conditions.
- **Shared NPC Chance Helpers**: When multiple views need encounter probabilities, implement a single pure helper (e.g. `getNpcEncounterChances()` in `weatherUtils.ts`) returning 0-100 scale percentages.
- **Centralized Formatters**: All numeric formatting (currency, suffixes) must use `src/logic/utils/formatters.ts`. Never call `toLocaleString()` directly for currency; use `formatCurrency()`.
- **Showdown Generation Centralization**: Never hardcode the target generation number. Always import `ACTIVE_GENERATION` from `@/data/system/constants` for easy upgrades.
- **Centralized Audio Play API**: Never invoke dynamic sound methods directly on `audioStore` (like `audioStore.sentMsg()`). Always use the central method `audioStore.play('soundName')`.
- **Dynamic Move Coverage Validation**: Any new moves with special effects added to `POKEMON_DB` must be mapped to valid action handlers in `ActionRegistry`. This is validated at build time via `actionRegistry.spec.ts`.

## Verification

- Run `npm run test:node` using the native Node.js test runner for pure mathematical logic.
- Run `npm run audit:full` to verify type integrity and avoid any `any` usage.

## Reference Manuals

- [battle_mechanics_manual.md](../../.agents/skills/project-standards/references/battle/battle_mechanics_manual.md): Core battle engine mechanics and math formulas.
- [game_mechanics_manual.md](../../.agents/skills/project-standards/references/core/game_mechanics_manual.md): Game loops, stats, and states.
- [game_formulas_manual.md](../../.agents/skills/project-standards/references/core/game_formulas_manual.md): Formulas reference sheet.
- [time_system_manual.md](../../.agents/skills/project-standards/references/core/time_system_manual.md): Cycles, weather, and seasonal timers.
- [evolution_manual.md](../../.agents/skills/project-standards/references/systems/evolution_manual.md): Evolution system triggers.
- [encounter_manual.md](../../.agents/skills/project-standards/references/systems/encounter_manual.md): Wild encounters multipliers.
- [gym_system_manual.md](../../.agents/skills/project-standards/references/systems/gym_system_manual.md): Gym leaders and rematch formulas.
- [trade_social_manual.md](../../.agents/skills/project-standards/references/systems/trade_social_manual.md): Trading profiles and social chat structures.
- [spawn_grid_manual.md](../../.agents/skills/project-standards/references/systems/spawn_grid_manual.md): Map spawns and grids coordinates.
- [combat_camera_manual.md](../../.agents/skills/project-standards/references/battle/combat_camera_manual.md): Viewports and battle camera triggers.
- [animated_sprites_manual.md](../../.agents/skills/project-standards/references/technical/animated_sprites_manual.md): Sprite database structure and scales.

## Child DOX Index

- [hover/AGENTS.md](./hover/AGENTS.md): Auto-indexed sub-module.

- [evolution/AGENTS.md](./evolution/AGENTS.md): Auto-indexed sub-module.

- [encounters/AGENTS.md](./encounters/AGENTS.md): Auto-indexed sub-module.

- [audio/AGENTS.md](./audio/AGENTS.md): Auto-indexed sub-module.

- [auth/](./auth/): Local and online authentication routers.
- [battle/](./battle/): FSM orchestrators, combat engine, moves database.
- [breeding/](./breeding/): Breeding formulas, daycare constraints.
- [combat/](./combat/): Active combat math and status handlers.
- [constants/](./constants/): System constants and registries.
- [db/](./db/): DBRouter database adapter.
- [debug/](./debug/): Offline console state injector.
- [economy/](./economy/): Shops, prices, and balance formulas.
- [environment/](./environment/): Weather cycles, map settings.
- [events/](./events/): In-game events triggers.
- [gym/](./gym/): Gym requirements and rematch mechanics.
- [inventory/](./inventory/): Inventory logic and usage validation.
- [items/](./items/): Item behavior databases.
- [map/](./map/): Spawn systems, grid cells mapping.
- [minigames/](./minigames/): Casino/minigame math.
- [modals/](./modals/): Modal orchestration queues.
- [player/](./player/): Trainer metadata and class handlers.
- [pokemon/](./pokemon/): Pokemon stats growth, factories, and sanitization.
- [providers/](./providers/): Showdown move translation providers.
- [pvp/](./pvp/): Matchmaking routers, network sync.
- [render/](./render/): Graphic animation workers and canvas rendering.
- [services/](./services/): External assets and network API managers.
- [utils/](./utils/): Shared formatting libraries.
- [validation/](./validation/): Input validators and data schema checking.
- [war/](./war/): Factions point calculators.
- [weather/](./weather/): Weather effects multipliers.
