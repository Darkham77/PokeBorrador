# Purpose

Data directory containing cases database, coverage reports, E2E browser failures, and progress logs for the simulation ecosystem.

## Ownership

QA / Core Engine Team.

## Local Contracts

- All files here are generated results or tracking databases and should not be modified manually except for setup tasks.
- `fuzzer_certified_cases.json` is a vital fixture database for browser simulations.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
