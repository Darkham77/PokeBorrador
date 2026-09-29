# Purpose

Encapsulates environmental, climate, lighting, and weather inheritance logic for all map locations in Poké Vicio using an immutable OOP class hierarchy.

## Ownership

Game Logic Engineers / World Environment Designers.

## Local Contracts

- **Immutable Class Hierarchy (`BaseMapEnvironment`, `concreteEnvironments.ts`)**:
  - `BaseMapEnvironment`: Abstract base contract taking frozen `MapEnvironmentBoundaries` derived 100% from `FIRE_RED_MAPS`, exposing `isWeatherAllowed()`, `isWeatherTypeAllowed()`, `assertWeatherAllowed()`, `resolveCombatWeather()`, and `resolveEffectiveLighting()`.
  - Concrete semantic classes (`OutdoorEnvironment`, `SubterraneanCaveEnvironment`, `InteriorFacilityEnvironment`, `StadiumEnvironment`) implement polymorphic classification without hardcoded domain logic.
- **Map Boundaries & Ambient Weather Contract**:
  - Ambient weather and lighting are governed 100% by the immutable boundaries defined on each map in `FIRE_RED_MAPS` (`weatherEnabled`, `allowedWeathers`, `supportedCycles`, `fixedCycle`).
  - Generic stadiums (`stadium`) strictly disallow natural ambient weather (`weatherEnabled: false`) and lock lighting to daylight (`fixedCycle: 'day'`). Combat entered in `stadium` initializes without ambient weather (`{ type: 'none', visual: 'clear', turns: -1 }`). In-combat moves and abilities (e.g. *Rain Dance*, *Drizzle*) remain fully functional per Pokémon Showdown simulation rules.
  - Subterranean caves and indoor locations declare their own legitimate boundaries in `FIRE_RED_MAPS` (e.g., fog in Mt. Moon, mist in Pokémon Tower). Attempting to inject any ambient weather that violates a map's boundaries MUST fail loudly with a descriptive error.
- **Lighting Cycle Resolution**:
  - Maps specify supported cycles (`supportedCycles`) or a forced cycle (`fixedCycle`). Closed facilities and generic stadiums override ambient day/night cycles with fixed lighting (`day`), preventing night darkness inside brightly lit arenas.
- **Environment Registry (`mapEnvironmentRegistry.ts`)**:
  - Provides constant-time $O(1)$ lookup mapping map IDs from `FIRE_RED_MAPS` to their concrete `BaseMapEnvironment` instances. Fails loudly on unknown map IDs.

## Work Guidance

- Ensure all new map environments inherit from `BaseMapEnvironment` and are registered in `mapEnvironmentRegistry.ts`.
- Adhere strictly to `@/domain-type-first` and named constants.

## Verification

- `npm run test:node tests/node/world/map_environment_weather_matrix.test.ts`
- `npm run audit:md`

## Child DOX Index

- *This domain module does not contain nested sub-directories with independent AGENTS.md files.*
