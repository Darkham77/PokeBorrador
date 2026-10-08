# Purpose

Team and item random generators to construct testing batches for the Gen 9 combat fuzzer.

## Ownership

QA / Core Engine Team.

## Local Contracts

- All generated teams and items must adhere to standard Gen 9 Showdown format validation.

## Key Files

- `fuzzer_ai_team_generator.ts`: Module implementation.
- `fuzzer_item_generator.ts`: Module implementation.
- `fuzzer_team_generator.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
