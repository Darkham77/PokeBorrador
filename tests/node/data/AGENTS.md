# Purpose

Node.js unit and integration tests for data generators, database build scripts, and Pokemon metadata datasets.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Static Generation Integrity**: All tests in this directory verify data generation logic and dataset consistency without mutating source files.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
