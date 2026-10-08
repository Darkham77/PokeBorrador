# Purpose

Domain test suites for maintenance scripts, account repair tools, and administrative utilities.

## Ownership

DevOps / Tooling Engineers.

## Local Contracts

- Test suites must be 100% self-contained and mock external database or network resources.
- Use in-memory SQLite fixtures (`:memory:`) or mocked PostgreSQL clients to guarantee deterministic results.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
