# Purpose

Test environment setups, mocks libraries, and database seed generation scripts.

## Ownership

Quality Assurance / Systems Developers.

## Local Contracts

- Defines helper functions for database mock seeding and stub assertions.
- **Centralized Test Setup Helpers (`setupTestEnvironment.ts`)**: Single Source of Truth for test environment handlers, providing `setupTestTeamGenerators()` for rival/trainer generation and `setupTemporalMock()` for fake-timer clock synchronization across both Node and JSDOM test setups without duplicating code.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
