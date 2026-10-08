# Purpose

This directory encapsulates individual status condition engines and volatile status handlers for turn-end and active-combat phases.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- All status ticks must remain deterministic and zero-timer compliant.
- Use `requireVolatileStatusKey` to guarantee domain-type safety when manipulating dynamic volatile counters.

## Key Files

- [primaryStatusEngine.ts](./primaryStatusEngine.ts): Manages primary status condition damage ticks (`brn`, `psn`, `tox`), visual status icons, and bad poison escalation.
- [volatileStatusEngine.ts](./volatileStatusEngine.ts): Manages volatile status ticks, countdown timers, and special effects (`yawn`, `lockedmove`, `partiallytrapped`, `disabled`, `encore`, `taunt`, `thrash`, `bound`, `ingrain`, `perishSong`, `cursed`).

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
