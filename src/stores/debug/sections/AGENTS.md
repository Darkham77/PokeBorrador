# Purpose

Segmented store logic sections for dev debug features.

## Ownership

Systems Developers.

## Local Contracts

- Defines specialized functions for administering maps, items, battle simulation, and trainer editor panels.
- **Exhaustive Cooldown Purging**: Debug actions that clear cooldowns (`stats-clear-cooldowns`) must reset state across all persistence layers (`game.state`, `profileStore.profileData`, and `localStorage` session metadata) to prevent lingering cooldown locks.

## Key Files

- `battleTools.ts`: Module implementation.
- `itemTools.ts`: Module implementation.
- `mapTools.ts`: Module implementation.
- `pokeTools.ts`: Module implementation.
- `statsTools.ts`: Module implementation.
- `systemTools.ts`: Module implementation.
- `timeTools.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
