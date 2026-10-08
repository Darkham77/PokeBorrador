# Purpose

Authentication state verification, session retry strategies, and profile metadata enrichment.

## Ownership

State Architects / Security Engineers.

## Local Contracts

- `authSessionVerifier.ts`: Online session verification with cold-start retry strategies, session ID persistence, and profile enrichment.

## Key Files

- [`authSessionVerifier.ts`](./authSessionVerifier.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` and `npm run auditor`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
