# Purpose

Unit test suites for social features, rankings, theater, and chat components.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test social rankings, podium, and theater replay components under JSDOM environment.
- Maintain domain suite cohesion (`social_rankings_suite.spec.ts`).
- Ensure no memory leaks or uncleaned Pinia store state across tests.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test:unit tests/unit/components/social/` to verify social component tests.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
