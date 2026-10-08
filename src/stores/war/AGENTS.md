# Purpose

War store helper routines, milestone reward calculations, dominance reconciliation, and guardian lockout management.

## Ownership

State Architects / Gameplay Engineers.

## Local Contracts

- `warStoreHelpers.ts`: Pure domain logic and database query helpers for faction dominance, weekly point calculations, guardian lockout registrations, and war coin awards.

## Key Files

- [`warStoreHelpers.ts`](./warStoreHelpers.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run `npm run test` and `npm run audit`.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
