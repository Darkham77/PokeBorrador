# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Seat Property Resolution Integrity**: `getSeatProperty` MUST strictly resolve slot properties via direct UID matching on entry and exit slots first, before falling back to active slot evaluation (`isActive ? seat.entry : seat.exit`). Implementing manual preference chains that check `seat.entry[prop]` for non-null values prior to fallback is strictly forbidden, as non-null default values (such as `'pokeball'`) will permanently shadow valid data stored in `seat.exit`.

## Verification

- Run standard validation scripts.
