# Purpose

Encapsulates environmental, climate, lighting, and weather inheritance logic for all map locations in Poké Vicio using an immutable OOP class hierarchy.

## Ownership

Game Logic Engineers / World Environment Designers.

## Local Contracts

- **Immutable Class Hierarchy (`BaseMapEnvironment`, `concreteEnvironments.ts`)**:
  - `BaseMapEnvironment`: Abstract base contract defining `isWeatherAllowed()`, `resolveCombatWeather()`, `resolveEffectiveLighting()`, `getSupportedCycles()`, and `isCave()`.
  - Concrete classes (`OutdoorEnvironment`, `CaveEnvironment`, `IndoorEnvironment`, `GymEnvironment`) implement polymorphic behavior without conditional branching spaghetti.
- **Closed Environment Weather Suppression**:
  - Subterranean caves, indoor rooms, and gym arenas strictly disallow natural ambient weather (`isWeatherAllowed() === false`).
  - Combat entered from closed environments MUST initialize with `{ type: 'none', visual: 'clear', turns: -1 }`.
- **Lighting Cycle Resolution**:
  - Closed spaces override ambient day/night cycles with fixed lighting (`day` or artificial cave illumination), preventing night darkness inside brightly lit facilities.
- **Environment Registry (`mapEnvironmentRegistry.ts`)**:
  - Provides constant-time $O(1)$ lookup mapping map IDs to their concrete `BaseMapEnvironment` instances.

## Work Guidance

- Ensure all new map environments inherit from `BaseMapEnvironment` and are registered in `mapEnvironmentRegistry.ts`.
- Adhere strictly to `@/domain-type-first` and named constants.

## Verification

- `npm run test:node tests/node/world/map_environment_weather_matrix.test.ts`
- `npm run audit:md`

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
