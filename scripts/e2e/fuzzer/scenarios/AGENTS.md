# Purpose

Scripted scenarios for complex abilities and list of excluded abilities from combat fuzzer.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Scenario files should not contain executable runner code, only exported configuration structures.

## Key Files

- `fuzzer_ability_scenarios.ts`: Module implementation.
- `fuzzer_excluded_abilities.ts`: Module implementation.
- `fuzzer_mechanics_scenarios.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
