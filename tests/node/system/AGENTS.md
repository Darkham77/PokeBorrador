# Purpose

Node.js logical tests for SQL translator compliance, global math utilities, and database transactions logic.

## Local Contracts

- **Database Schema Parity Tests**: Persistence helpers and query adapter payloads must be accompanied by integration tests verifying that all update/insert keys match actual SQLite column names without relying solely on shallow mock objects.
- **Exhaustive Escrow & Transit Backup Audit Mandate**: Backup validation suites (`backup_full_validation.test.ts` and `backup_migration_real.test.ts`) MUST exhaustively audit 100% of serialized entities across in-transit and escrow tables (`claim_queue`, `market_listings`, `trade_offers`) against Valibot schemas (`pokemonSchema`, `claimItemSchema`, `gtsListingSchema`) and canonical Showdown Dex legality, asserting zero corrupted natures, missing species, or null status.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
