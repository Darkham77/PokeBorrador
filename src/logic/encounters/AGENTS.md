# Purpose

Generate wild Pokémon encounters, fishing pools, and archaeology spawns based on zone metadata.

## Ownership

Game Designers / Encounter Logic Developers.

## Local Contracts

- Keep encounter calculations decoupled from views.
- **Mandatory Field Modifiers Coordinator Consumption**: Wild, fishing, and archaeology encounter generators (`encounters.ts`, `fishingEncounterHelper.ts`, `encounterHelpers.ts`) MUST delegate all leader abilities, item buffs, incense filtering, level filtering, and shiny boosts to `resolveFieldEncounterModifiers` from `@/logic/rules/fieldRulesCoordinator`. Scattering ad-hoc `if (leader.ability === '...')` checks across encounter generators is strictly prohibited.
- **Dynamic Event Injection Safety**:
  - Dynamic event injection in `getEncounterPool` / `getFinalGroundRates` MUST safely parse configs via `safeParse`, resolve weekly rotation themes, skip wildcard `'*'` open events, and filter species with `isPokemonSpeciesId` before pushing to spawn pools or modifying weight distributions.
- **Encounter Pool Presence & Map Exploration Visibility**:
  - Maps without wild encounter pools across all cycles, weathers, and seasons (`hasMapEncounterSpawns(loc) === false`), or explicitly marked with `visibleInWorldMap: false` (such as `stadium`), MUST return `false` in `isMapVisibleInWorld` and be excluded from wild map cards.
  - `generateEncounter` and `generateGroundEncounter` return `null` safely without attempting selection on empty pools (`selectFromPool`). Direct navigations to arenas (`stadium`, `gym`) redirect cleanly to the gyms tab without raising unhandled promise rejections.
- Ensure spawn pool probabilities sum to 100% or follow standard spawn rates mapping.

## Key Files

- `encounterUI.ts`: Module implementation.
- `npcEncounterChances.ts`: Module implementation.
- `routeSpawnMath.ts`: Module implementation.
- `routeWeatherDomainHelpers.ts`: Module implementation.
- `specialEncounterCheckers.ts`: Module implementation.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
