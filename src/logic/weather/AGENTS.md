# Purpose

Manage the logic and assets of weather.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Canonical Showdown Weather vs Visual Weather Separation**: Combat engine climate states (`ShowdownWeatherId`: `'sunnyday'`, `'raindance'`, `'sandstorm'`, `'snow'`, `'hail'`, `'fog'`, `'desolateland'`, `'primordialsea'`, `'deltastream'`, `'none'`) MUST remain strictly distinct from visual atmospheric environment states (`WeatherId`: `'sun'`, `'rain'`, `'storm'`, etc.). Both catalogs are derived canonically from `as const` arrays centralized in `weatherRegistry.ts`.
- **Weather Localization Single Source of Truth (`getLocalizedWeatherName`)**: `getLocalizedWeatherName(officialWeatherId: ShowdownWeatherId | WeatherId, gen: number)` is the unique authority for localizing weather tokens into Spanish (`'Despejado'` for `none`/`clear`/`null`, `'Sol'` for `sunnyday`/`sun`, etc.). Callsites MUST NEVER provide fallback literals (e.g. `: 'Despejado'`) or duplicated string mapping dictionaries.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- When mapping environmental climates to battle simulator inputs, always use `mapVisualToOfficialWeather` taking the generation ruleset into account.
- Ensure all mappings between `ShowdownWeatherId` and `WeatherId` are fully typed using `satisfies Record<ShowdownWeatherId, WeatherId>` without open string escapes.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
