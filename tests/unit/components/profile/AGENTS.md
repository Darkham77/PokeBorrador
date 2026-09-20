# tests/unit/components/profile/

Unit test suites for player profile components and cards.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test profile cards, ranked medals, and pinned replays under JSDOM environment.
- Maintain domain suite cohesion (`profile_cards_suite.spec.ts`).
- Ensure no memory leaks or uncleaned Pinia store state across tests.

## Verification

- Run `npm run test:unit -- tests/unit/components/profile/` to verify profile component tests.
