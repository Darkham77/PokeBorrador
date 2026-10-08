# Purpose

Map coordinates, routes assets mapping, gyms/badges configuration, and weather-tables.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Unified Map Database SSoT (`FIRE_RED_MAPS`)**:
  - All battle locations (routes, caves, interior facilities, and stadiums) are standard map entries in `FIRE_RED_MAPS`.
  - The generic universal stadium map has `id: 'stadium'`, serving as the combat location for standard gym battles and PvP matches.
  - Map boundaries (`weatherEnabled`, `allowedWeathers`, `supportedCycles`, `fixedCycle`, `isIndoors`, `isCave`, `visibleInWorldMap`) in `FIRE_RED_MAPS` dictate the absolute limits for combat environments.
  - Non-wild combat arenas (such as `stadium`) declare `visibleInWorldMap: false` and are excluded from the exploration map grid (`VISIBLE_WORLD_MAPS`).
  - Gym leaders fighting in `stadium` strictly adhere to `stadium` boundaries (e.g. ambient weather disabled). Future gym leaders with custom environmental conditions must declare their own specialized stadium map in `FIRE_RED_MAPS`.

## Key Files

- `gymRematches.ts`: Module implementation.
- `gyms.ts`: Module implementation.
- `map-assets.ts`: Module implementation.
- `maps.ts`: Module implementation.
- `weather-tables.ts`: Module implementation.

## Work Guidance

- When adding or modifying maps in `FIRE_RED_MAPS`, ensure environmental boundaries are explicitly specified.
- Keep `MAP_ROUTE_MAPPING` aligned with asset filenames without declaring ghost or duplicate map IDs.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
