# Purpose

Domain boundary and module implementation for ai. Defines architectural responsibilities and subsystem logic.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Overview

This directory contains typed dataset wrappers and JSON databases for battle AI random sets and heuristic evaluation data.

### Governance & Standards

- Raw JSON files must be wrapped by typed Data Wrappers (`randomSetsData.ts`).
- Direct import of raw `.json` files in business logic is strictly prohibited.

## Key Files

- [`randomSetsData.ts`](./randomSetsData.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
