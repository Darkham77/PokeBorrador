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

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
