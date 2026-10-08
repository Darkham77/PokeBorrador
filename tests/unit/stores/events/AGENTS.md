# Purpose

Unit tests for event stores and prize granting logic.

## Ownership

State Architecture / QA Engineers.

## Local Contracts

- Test event awards, money grants, BC distribution, and Pokemon prize actions in isolation.
- `test_event_prize_grantor.spec.ts`: Unit tests verifying atomic reward delivery and UI notifications for event prize types.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` to verify event store unit tests.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
