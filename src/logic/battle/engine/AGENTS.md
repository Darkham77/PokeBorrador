# Purpose

Contains the core single-path battle engine adapter (`showdownBattleEngine.ts`) wrapping `@pkmn/sim` for deterministic turn execution and cheat application.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Governance & Rules

- `ShowdownBattleEngine` is the single source of truth for battle execution across fuzzer, replayer, and simulation modes.
- IPB healing cheats MUST be suppressed during `force-switch` turns to preserve Showdown choice validation.
- All switch choice failures MUST attempt move fallback slots before throwing explicit errors.
- **Skipped Seat Choice Bypass Contract (`showdownSeatSyncHelper.ts`)**: When a seat is marked as skipped (`seatInput.skip: true`, e.g. during a mid-turn forced switch or medicine item usage where an actor passes), `buildTurnSeats` MUST NOT invoke `resolveChoice` nor attempt to consume certified replayer choices. It must assign `choice: 'pass'` immediately, preventing spurious "Required certified choice is missing" exceptions in replayer mode.

## Key Files

- `pokemonLegalityValidator.ts`: Module implementation.
- `rivalTeamGenerator.ts`: Module implementation.
- `showdownChoiceResolver.ts`: Module implementation.
- `showdownSpreadModifyHelper.ts`: Module implementation.
- [`showdownBattleEngine.ts`](./showdownBattleEngine.ts): Module implementation.
- [`showdownSeatSyncHelper.ts`](./showdownSeatSyncHelper.ts): Module implementation.
- [`showdownTurnExecutionHelper.ts`](./showdownTurnExecutionHelper.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
