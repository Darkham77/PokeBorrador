# Purpose

Manage the states, helpers, and strategies for global hover cards/tooltips.

## Ownership

UI / Interaction Logic Developers.

## Local Contracts

- Separate Hover state logic from template representation.
- Ensure all hover strategies conform to standard interaction patterns.

## Key Files

- `globalHover.ts`: Module implementation.
- `hoverEnter.ts`: Module implementation.
- `hoverEnterChildren.ts`: Module implementation.
- `hoverHelpers.ts`: Module implementation.
- `hoverLeave.ts`: Module implementation.
- `hoverStrategies.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
