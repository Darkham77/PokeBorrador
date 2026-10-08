# Purpose

Node.js logical tests for debug simulation helpers, test fixtures, and simulated database seeding.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Key Test Suites

- `rewards_debug_simulation_market_listings.test.ts`: Unit test asserting simulated GTS claim and market listing database insertions conform strictly to the canonical schema.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
