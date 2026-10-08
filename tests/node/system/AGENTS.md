# Purpose

Node.js logical tests for SQL translator compliance, global math utilities, and database transactions logic.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Database Schema Parity Tests**: Persistence helpers and query adapter payloads must be accompanied by integration tests verifying that all update/insert keys match actual SQLite column names without relying solely on shallow mock objects.
- **Exhaustive Escrow & Transit Backup Audit Mandate**: Backup validation suites (`backup_full_validation.test.ts` and `backup_migration_real.test.ts`) MUST exhaustively audit 100% of serialized entities across in-transit and escrow tables (`claim_queue`, `market_listings`, `trade_offers`) against Valibot schemas (`pokemonSchema`, `claimItemSchema`, `gtsListingSchema`) and canonical Showdown Dex legality, asserting zero corrupted natures, missing species, or null status.

## Key Files

- [`reproduce_official_servers_missing_local.test.ts`](./reproduce_official_servers_missing_local.test.ts): Systematic debugging reproduction test verifying TypeScript compilation and runtime exports without TS2306 when `servers.local.json` is absent.
- [`db_router_dispatch.test.ts`](./db_router_dispatch.test.ts): Verification tests for DBRouter dispatch, offline RPC emulation, time offset manipulation, and session isolation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
