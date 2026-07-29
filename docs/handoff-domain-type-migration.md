# Domain Type Migration Handoff

Last updated: 2026-07-29

## Active Objective

Finish the domain-type migration and make `npm run build` pass without weakening domain types, adding legacy compatibility adapters, or inventing non-Showdown IDs.

## Non-Negotiable Constraints

- Use `external/pokemon-showdown-code/` and generated Showdown data as the canonical source of truth for Pokemon, move, ability, item, status, and battle mechanic IDs.
- Do not keep legacy effect IDs, Spanish logical IDs, fake move IDs, or runtime translation dictionaries.
- Gender domain is `PokemonGender = 'm' | 'f' | null`. Save compatibility may decode `M/F/N`, with `N` representing `null`; runtime/domain code must not introduce a third gender string.
- Boundary inputs must be validated with canonical guards such as `requirePokemonSpeciesId`, `requirePokemonMoveId`, `requireAbilityId`, `requireMapRouteId`, `requireGymId`, or equivalent owner-module helpers.
- Do not relax finite domains to `string`, `| string`, `Record<string, ...>`, mutable `Set<string>`, or unsafe assertions just to satisfy TypeScript.
- No silent fallbacks. Missing IDs must throw explicit errors.

## Skills and Contracts Used

- `.agents/skills/project-standards/SKILL.md`
- `.agents/skills/domain-type-first/SKILL.md`
- `.agents/skills/dox-navigator/SKILL.md`
- Root `AGENTS.md`
- Local DOX contracts for edited trees under `src/components`, `src/logic`, `src/stores`, and `tests`.

## Completed Design Decisions

- `PokemonMoveId` is derived from generated `src/data/battle/moves.json` keys through `MOVE_TRANSLATIONS_ES`.
- Move data now uses structured Showdown fields (`boosts`, `secondary`, `secondaries`, `self`, `status`, `volatileStatus`, `sideCondition`, `weather`) instead of legacy local string effect IDs.
- `MoveEffect` is treated as a structured object, not as a string lookup key.
- `pokemonDataProvider` no longer has a `SPECIAL_EFFECTS` dictionary mapping Showdown move IDs into legacy effect names.
- TM display data now includes explicit `moveId` values using official Showdown move IDs.
- `restoreFossil` validates incoming species through `requirePokemonSpeciesId`.
- Adventure graph node IDs were separated from map route IDs using `AdventureNodeId`.
- Travel buff item domains were separated into `TravelBuffItemId` and `TravelIncenseItemId`.
- NPC trainer sprites and species pools now validate through canonical domain guards instead of falling back.
- Evolution and breeding code now validates species and move IDs at boundaries.
- `PokemonTmsTab` now reads TM compatibility through `getCompatibleTmIds(speciesId)` instead of indexing the partial Gen 1 compatibility table directly.
- `battleMoves.applyMoveEffect` now accepts structured `MoveEffect | MoveEffect[]`; string effect IDs are no longer accepted in that PVP path.
- `assetService` now uses owner-module guards for `MapWithCycleId` and `PlayerClassId`.
- `weatherRegistry` now separates raw Showdown weather IDs (`ShowdownWeatherId`) from internal `WeatherId`.
- `war.ts` now stores `dailyGuardianCaptures` as `MapRouteId[]` and validates DB/input route IDs through `requireMapRouteId`.
- `combatShadows` now resolves sprite feet coordinates through `requireFeetPoints` instead of raw string indexing.
- Breeding hatch logic no longer resolves egg moves by Spanish display name; `movesAtBirth` is treated as canonical `PokemonMoveId[]`.
- Breeding deposit checks now use `isLegendaryPokemonSpeciesId`, `isBabyPokemonSpeciesId`, and `isFossilPokemonSpeciesId` instead of mutable `Set` or tuple casts.
- Debug egg creation now uses canonical `PokemonEgg`, validates egg species with `requirePokemonSpeciesId`, and stores `movesAtBirth` as `PokemonMoveId[]`.
- Faction now has owner-module guards `isFactionId` and `requireFactionId` in `src/types/system/game.ts`.
- Debug map/item/weather tools now validate boundary strings through owner guards (`requireItemId`, `requireFactionId`, `requireMapRouteId`, `requireWeatherId`/`isWeatherId`) and use typed `Inventory` / `DominanceInfo` maps.
- `mapWinners` is now a `Partial<Record<MapRouteId, DominanceInfo>>`; forced global weather is typed as `WeatherId | null`.
- Debug pokedex sync now stores `PokemonSpeciesId[]`, debug egg scan sums IVs through `POKEMON_STAT_KEYS`, and debug evolution no longer falls back to an invented `vaporeon` target.
- `pokemonActions.registerPokedex` now accepts `PokemonSpeciesId`; `chooseStarter` validates its boundary input with `requirePokemonSpeciesId`.
- `pokemonActions.validateAll` now validates inventory IDs with `requireItemId` and fails fast on contradictory egg species data instead of mutating legacy eggs at runtime.
- `leaderboard.ts` now converts nullable DB cosmetic style fields to absent optional values instead of leaking `null` into the UI contract.
- `ui.ts` now validates evolution target species with `requirePokemonSpeciesId` before storing modal state or delegating to the evolution store.
- Adventure travel now separates `AdventureNodeId` graph nodes from `MapRouteId` map routes in `AdventureDirectionPad`, `useAdventureLayout`, and `useAdventureSimulation`.
- `kantoGraph.ts` now exposes typed `GraphEdge` endpoints as `AdventureNodeId` instead of raw strings.
- `PreTravelModal` and `useAdventureRouting` now use the refined `ShopItemData & { id: TravelBuffItemId }` contract for travel buff items.
- `GymsView` now stores selected card difficulty as `GymDifficultyId`.
- `MapView` now validates raw navigation inputs with `requireMapRouteId` and `gameStore.dailyGuardianCaptures` validates saved route IDs through `requireMapRouteId`.
- `PokedexView`/`usePokedex` now preserve `PokemonSpeciesId` order types instead of widening Pokédex order IDs to string.

## Important Files Already Touched

- `src/data/battle/moves.ts`
- `src/types/pokemon/pokemon.ts`
- `src/types/system/database.ts`
- `src/logic/providers/pokemonDataProvider.ts`
- `src/logic/battle/actions/actionRegistry.ts`
- `src/logic/battle/battleMoves.ts`
- `src/logic/battle/moveTooltipMath.ts`
- `src/logic/pokemon/pokemonFactory.ts`
- `src/logic/pokemon/pokemonMath.ts`
- `src/logic/pokemon/pokemonUtils.ts`
- `src/logic/items/itemEffects.ts`
- `src/logic/items/fossilEngine.ts`
- `src/data/pokemon/pokedex.ts`
- `src/components/pokemon-detail/PokemonTmsTab.vue`
- `src/logic/map/mapCardHelper.ts`
- Multiple adventure, breeding, evolution, trainer, and Showdown bridge modules.

## Latest Validation Snapshot

Latest command run:

```bash
npm run validate:types
```

Status: passing.

Current production-side status:

- `npm run validate:types` passes after migrating production views, stores, data wrappers, and current test fixtures to strict domain IDs.
- `Item.kind` now represents finite inventory kind values (`held`, `usable`, `stone`, `booster`), while `Item.type` is reserved for `PokemonType`.
- `src/data/inventory/items.ts` validates raw JSON item kind values through `requireItemKind` instead of parsing them as Pokemon elemental types.
- `Item.stoneType` now uses `EvolutionStoneKind` (`fire`, `water`, `thunder`, `leaf`, `moon`, `sun`, `oval`) instead of `PokemonType`.
- `src/logic/battle/actions/actionRegistry.ts` no longer falls back from `move.id` to `move.name` in error logging; missing canonical move IDs now fail loudly.
- `tests/node/pokemon/pokemon_utils.test.ts` now uses structured `MoveEffect` objects instead of legacy effect strings like `burn_10` and `poison`.
- `tests/node/battle/heuristic_ai.test.ts` expects Showdown's canonical empty-string no-status marker.
- `tests/node/system/npc_name_generator.test.ts` now uses Vitest imports so the suite is discoverable by the build test runner.
- `src/data/world/maps.ts` fixes `route1.thunderstorm` so Castform is an exclusive weather encounter, matching the Castform severe-weather contract.

Current build-side status:

- `npm run build` now passes.
- The successful build included 59 Vitest node suites, 3384 passing tests, project audit with 0 errors, domain type audit with 0 errors/warnings, FSM validation, item integrity, ability validation, move validation, SQL/save migration validation, and the Vite production build.
- Existing audit warnings remain, but none were build-blocking in this run.

Current known risk:

- `src/data/inventory/items.json` still stores the raw item class field as `type`; `src/data/inventory/items.ts` treats that as a data boundary and exposes the strict runtime contract as `kind`. A future generated-data cleanup can rename the JSON field to `kind`, but the public TypeScript contract is no longer ambiguous.

## Next Recommended Steps

1. Keep `docs/handoff-domain-type-migration.md` updated if further domain cleanup continues.
2. Before any commit flow, run the project-required checks for that workflow, especially:

```bash
npm run build
npm run validate:domain-types -- --errors-only --summary
```

3. Do not restore legacy move effect IDs, Spanish IDs, fake IDs, `| string` domain widening, or lookup fallbacks.

## Caution

Do not solve remaining errors by widening types, casting generated databases to `Record<string, ...>`, restoring legacy move effect names, or adding compatibility dictionaries. The remaining errors are the migration work.
