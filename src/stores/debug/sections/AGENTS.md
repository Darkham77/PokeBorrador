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

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
