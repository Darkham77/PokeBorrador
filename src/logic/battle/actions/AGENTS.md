# Purpose

Execution commands, registry setups, and triggers for combat actions.

## Ownership

Battle Engine Developers.

## Local Contracts

- Implements switch commands, item usage hooks, and move executions.

## Key Files

- `actionRegistry.ts`: Module implementation.
- `fieldActions.ts`: Module implementation.
- `healingActions.ts`: Module implementation.
- `specialActions.ts`: Module implementation.
- `specialActionsHelper.ts`: Module implementation.
- `specialActionsRoarHelper.ts`: Module implementation.
- `specialActionsTeleportHelper.ts`: Module implementation.
- `statusActions.ts`: Module implementation.
- `switchAction.ts`: Module implementation.
- `switchActionHelpers.ts`: Module implementation.
- `switchSequenceHelper.ts`: Module implementation.
- `switchWorkerTurn.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
