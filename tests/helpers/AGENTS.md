# Purpose

Test environment setups, mocks libraries, and database seed generation scripts.

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Defines helper functions for database mock seeding and stub assertions.
- **Centralized Test Setup Helpers (`setupTestEnvironment.ts`)**: Single Source of Truth for test environment handlers, providing `setupTestTeamGenerators()` for rival/trainer generation and `setupTemporalMock()` for fake-timer clock synchronization across both Node and JSDOM test setups without duplicating code.

## Key Files

- [`battleMockSetup.ts`](./battleMockSetup.ts): Module implementation.
- [`debugSetup.ts`](./debugSetup.ts): Module implementation.
- [`legacyDataMocks.ts`](./legacyDataMocks.ts): Module implementation.
- [`pwaRegisterMock.ts`](./pwaRegisterMock.ts): Module implementation.
- [`setupTestEnvironment.ts`](./setupTestEnvironment.ts): Module implementation.
- [`supabaseMock.ts`](./supabaseMock.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
