# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Seat Property Resolution Integrity**: `getSeatProperty` MUST strictly resolve slot properties via direct UID matching on entry and exit slots first, before falling back to active slot evaluation (`isActive ? seat.entry : seat.exit`). Implementing manual preference chains that check `seat.entry[prop]` for non-null values prior to fallback is strictly forbidden, as non-null default values (such as `'pokeball'`) will permanently shadow valid data stored in `seat.exit`.
- **Battle Atmosphere & Lighting Hierarchy**: `useBattleAtmosphere.ts` is the single source of truth (SSoT) for arena lighting, weather particles, and CSS filters. It checks explicit battle/gym config (`fixedCycle`, `fixedWeather`), explicit map config (`supportedCycles`, `weatherEnabled`), and falls back to inspecting available battle background asset variants (`getAvailableCyclesForMap`). Arenas with single sprites (like default Gyms and PvP) are locked to `'day'` lighting and clear weather unless configured with explicit overrides or an in-battle move/ability sets active combat weather.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
