# Purpose

Integration test suites validating multiple subsystems interactions (e.g. database seeds to UI state flows).

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Verifies system behaviors across DBRouter boundaries.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [player/](./player/AGENTS.md): Integration test suites for player class lifecycles and deployments.
- [pvp/](./pvp/AGENTS.md): Integration test suites for real-time PvP battle flows and invite lifecycles.
