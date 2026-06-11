# Purpose

Manage the core mechanics, math formulas, data translations, and routing of the Poké Vicio project.

## Ownership

Logic Developers / Game Designers.

## Local Contracts

- DBRouter-enforced isolation between online (Supabase) and offline (SQLite) data.
- Complete separation of calculations from visual code (Pure Modules Pattern).

## Work Guidance

- Core mathematical calculations (battle stats, catch rates, damage, time cycles) must be extracted into pure TS files (*Math.ts) with zero dependency on Vue, Pinia, or Supabase.
- Avoid using legacy `Date` for engine calculations; use Node.js 26+ `Temporal` API.
- Use explicit `.ts` extensions for relative imports in Node.js utility contexts.
- Localize altered statuses in combat using the central Spanish `STATUS_NAME_MAP` translation dictionary.
- All check logic on equipped items must use English IDs (`exp_share`, etc.); Spanish translations are strictly for UI presentation.
- Decouple components using `GameBus` signals rather than tight dependencies.

## Verification

- Run `npm run test:node` using the native Node.js test runner for pure mathematical logic.
- Run `npm run audit:full` to verify type integrity and avoid any `any` usage.

## Child DOX Index

- `auth/` - Local and online authentication routers.
- `battle/` - FSM orchestrators, combat engine, moves database.
- `breeding/` - Breeding formulas, daycare constraints.
- `combat/` - Active combat math and status handlers.
- `constants/` - System constants and registries.
- `db/` - DBRouter database adapter.
- `debug/` - Offline console state injector.
- `economy/` - Shops, prices, and balance formulas.
- `environment/` - Weather cycles, map settings.
- `events/` - In-game events triggers.
- `gym/` - Gym requirements and rematch mechanics.
- `inventory/` - Inventory logic and usage validation.
- `items/` - Item behavior databases.
- `map/` - Spawn systems, grid cells mapping.
- `minigames/` - Casino/minigame math.
- `modals/` - Modal orchestration queues.
- `player/` - Trainer metadata and class handlers.
- `pokemon/` - Pokemon stats growth, factories, and sanitization.
- `providers/` - Showdown move translation providers.
- `pvp/` - Matchmaking routers, network sync.
- `services/` - External assets and network API managers.
- `utils/` - Shared formatting libraries.
- `war/` - Factions point calculators.
- `weather/` - Weather effects multipliers.
