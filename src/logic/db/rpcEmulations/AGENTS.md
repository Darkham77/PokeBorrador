# Purpose

Local SQLite emulation logic for Supabase RPC functions.

## Ownership

Backend / Database Developers.

## Local Contracts

- Implements RPC calls (like inventory trades or marketplace listing updates) locally for offline environments.

## Key Files

- `eventRpc.ts`: Module implementation.
- `marketRpc.ts`: Module implementation.
- `profileRpc.ts`: Module implementation.
- `rankedRpc.ts`: Module implementation.
- `saveRpc.ts`: Module implementation.
- `tradeRpc.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
