# Purpose

Encapsulate event modal view logic, bonus calculations, schedules, and past event award grouping.

## Ownership

Frontend Developers / Event Gameplay Engineers.

## Local Contracts

- **Domain Integrity**: Composables in this directory must consume canonical event models (`Event`, `PastEventHistoryItem`, `PendingAward`) without modifying raw event records directly.
- **Zero Duplication**: Shared calculations for event bonuses, schedules, prizes, and category grouping must be centralized here.

## Work Guidance

- Use standard Vue 3 Composition API patterns with `computed`, `toValue`, and `MaybeRefOrGetter`.
- Ensure timezone conversions use `GAME_TIMEZONE` and Temporal API abstractions.

## Verification

- Run `npm run lint` and `npm run test` to verify reactivity and business logic parity.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
