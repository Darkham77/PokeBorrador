# Purpose

Centralized shared test fixtures, domain matrices, and mock definitions for automated tests.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Defines parameterized test matrices and domain data fixtures for cross-suite assertions.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [assets/](./assets/AGENTS.md): Domain module documentation for sprite geometry and asset snapshots.
- [items/](./items/AGENTS.md): Domain module documentation for item families matrix fixtures.
