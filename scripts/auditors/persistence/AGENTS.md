# scripts/auditors/persistence/AGENTS.md

## Purpose & Scope

This directory contains database migration integrity, SQL dialect translation, and player save schema validators.

## Directory Structure & Files

- [_testDbHelper.ts](./_testDbHelper.ts): Shared test database setup and base schema initialization for persistence validators.
- [validate_sql_migrations.ts](./validate_sql_migrations.ts): Tests in-memory execution of all PostgreSQL-translated SQL migrations in SQLite and validates migration timestamp monotonicity.

## Local Governance & Rules

- Zero runtime database fallbacks: all schema evolutions must be verified via static SQL migrations.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
- **Lightweight Persistence Audit Scope**: Auditors in this family (`validate_sql_migrations.ts`) are restricted to static SQL syntax translation, dialect parity, and timestamp monotonicity verification (<1s execution). Heavy in-memory replay of historical migrations against real player save fixtures is strictly reserved for the Vitest test suite (`tests/node/system/backup_migration_real.test.ts`) to keep `npm run audit` sub-second and non-blocking.
