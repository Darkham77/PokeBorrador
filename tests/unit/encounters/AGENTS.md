# Purpose

Unit tests validating weather table mechanics, weather family definitions, and wild encounter calculations.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Governance & Rules

- Tests MUST use canonical weather constants and data types.
- Zero mock fallbacks for missing weather assets or invalid map keys.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
