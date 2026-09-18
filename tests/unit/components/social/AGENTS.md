# tests/unit/components/social/

Unit test suites for social features, rankings, theater, and chat components.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test social rankings, podium, and theater replay components under JSDOM environment.
- Maintain domain suite cohesion (`social_rankings_suite.spec.ts`).
- Ensure no memory leaks or uncleaned Pinia store state across tests.

## Verification

- Run `npx vitest run tests/unit/components/social/` to verify social component tests.
