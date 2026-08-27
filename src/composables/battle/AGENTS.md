# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Seat Property Resolution Integrity**: `getSeatProperty` MUST strictly resolve slot properties via direct UID matching on entry and exit slots first, before falling back to active slot evaluation (`isActive ? seat.entry : seat.exit`). Implementing manual preference chains that check `seat.entry[prop]` for non-null values prior to fallback is strictly forbidden, as non-null default values (such as `'pokeball'`) will permanently shadow valid data stored in `seat.exit`.
- **Orphan Interface Cleanup After `unknown` Refactors**: When refactoring functions to accept `unknown` + inline type assertions (e.g. `seat as { entry?: ... }`), any previously-dedicated interface (e.g. `SeatAnimState`, `SeatEntryExit`) becomes unused and MUST be deleted immediately. Leaving them causes TS6196 and is treated as an incomplete refactor.
- **Battle Atmosphere & Interior Climate Isolation**: `useBattleAtmosphere.ts` acts as the single source of truth (SSoT) for resolving combat arena lighting, weather particles, and CSS filters. Interior battles (Gyms, PvP, caves, and indoor buildings) MUST strictly enforce constant daylight lighting (`effectiveCycle = 'day'`) and clear natural weather (`effectiveBattleVisual = 'clear'`). In-combat weather is enabled exclusively when a move or ability actively casts it.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
