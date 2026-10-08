# Purpose

Unit test suites for player profile components and cards.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test profile cards, ranked medals, and pinned replays under JSDOM environment.
- Maintain domain suite cohesion (`profile_cards_suite.spec.ts`).
- Ensure no memory leaks or uncleaned Pinia store state across tests.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test:unit tests/unit/components/profile/` to verify profile component tests.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
