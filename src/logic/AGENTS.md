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
- **Normalization First**: During save loading flows (managed under `auth/` and `db/`), data normalization and legacy backfilling (`normalizeData`) MUST always run BEFORE strict schema validation (`validateAndSanitize`). This ensures old profile formats receive their required modern properties (like abilities, genders, and vigor) before validation.

## Domain Concepts & Glossary

- **Route Guardian**: A powerful alpha Pokémon that protects a specific route. Defeating or capturing it allows a player's faction to accumulate dominance points for that route.
- **Guardian Lockout**: A daily restriction applied to a player's account. A player is allowed to defeat or capture at most one Guardian per route per calendar day. Once locked out, the Guardian will no longer appear on the route map card or trigger combat encounters for the rest of the day.
- **Battle Cry**: A distinct audio clip associated with each Pokémon species. It is played when the Pokémon enters the battlefield, faints in combat (slowed and pitch-lowered), or executes voice-based status moves.
- **Volatile Counter**: A temporary turn-based counter attached to a Pokémon that ticks down at the end of each round and triggers an effect (such as sleep or self-inflicted damage) when it reaches zero. It is completely cleared when the Pokémon is withdrawn from the active combat seat.
- **Side Condition**: A status or delayed effect tied directly to a side of the field (player/enemy side) rather than a specific Pokémon. It persists across switches and affects whichever Pokémon occupies the active seat when it triggers (such as Wish).
- **Entity Lookup**: The process of retrieving a game entity (Pokémon, Move, Ability, Item, or Nature) from the database. It must be performed exclusively using the canonical English identifier (ID) to ensure data integrity and avoid silent fallbacks.
- **Identity Resolution**: The mechanism by which the application verifies that an entity ID exists in the database. If the ID is invalid or cannot be resolved, the engine must immediately halt and throw an explicit error to prevent corrupt state propagation.
- **Species Whitelist**: A global subset of Pokémon species identifiers (IDs) that are permitted across all game systems (such as combat, daycare/breeding, eggs, and enemy trainer teams). If any system requests a species whose ID is not present in this list, the data provider must prevent its generation by throwing an explicit identity resolution error.

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

- [audio/](./audio/AGENTS.md): Domain module documentation for audio.
- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [combat/](./combat/AGENTS.md): Domain module documentation for combat.
- [constants/](./constants/AGENTS.md): Domain module documentation for constants.
- [db/](./db/AGENTS.md): Domain module documentation for db.
- [debug/](./debug/AGENTS.md): Domain module documentation for debug.
- [economy/](./economy/AGENTS.md): Domain module documentation for economy.
- [encounters/](./encounters/AGENTS.md): Domain module documentation for encounters.
- [environment/](./environment/AGENTS.md): Domain module documentation for environment.
- [events/](./events/AGENTS.md): Domain module documentation for events.
- [evolution/](./evolution/AGENTS.md): Domain module documentation for evolution.
- [gym/](./gym/AGENTS.md): Domain module documentation for gym.
- [hover/](./hover/AGENTS.md): Domain module documentation for hover.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [items/](./items/AGENTS.md): Domain module documentation for items.
- [map/](./map/AGENTS.md): Domain module documentation for map.
- [minigames/](./minigames/AGENTS.md): Domain module documentation for minigames.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [player/](./player/AGENTS.md): Domain module documentation for player.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [providers/](./providers/AGENTS.md): Domain module documentation for providers.
- [pvp/](./pvp/AGENTS.md): Domain module documentation for pvp.
- [render/](./render/AGENTS.md): Domain module documentation for render.
- [services/](./services/AGENTS.md): Domain module documentation for services.
- [utils/](./utils/AGENTS.md): Domain module documentation for utils.
- [validation/](./validation/AGENTS.md): Domain module documentation for validation.
- [war/](./war/AGENTS.md): Domain module documentation for war.
- [weather/](./weather/AGENTS.md): Domain module documentation for weather.
