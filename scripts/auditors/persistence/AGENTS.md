# Purpose

This directory contains database migration integrity, SQL dialect translation, and player save schema validators for Poké Vicio. Generic persistence suites (`validate_sql_anti_patterns.ts`) reside in `node_modules/@francogp/auditor/src/suites/persistence/`.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- Zero runtime database fallbacks: all schema evolutions must be verified via static SQL migrations.
- All auditors in this family extend `BaseAuditor` or `FileScanAuditor` from `@francogp/auditor` and adhere to the `StandardAuditResult` contract.
- Registered in `audit.config.ts` under `extensions`.
- **Lightweight Persistence Audit Scope**: Auditors in this family (`validate_sql_migrations.ts`) are restricted to static SQL syntax translation, dialect parity, and timestamp monotonicity verification (<1s execution). Heavy in-memory replay of historical migrations against real player save fixtures is strictly reserved for the Vitest test suite (`tests/node/system/backup_migration_real.test.ts`) to keep `npm run auditor` sub-second and non-blocking.

## Key Files

- [_testDbHelper.ts](./_testDbHelper.ts): Shared test database setup and base schema initialization for persistence validators.
- [validate_schema_parity.ts](./validate_schema_parity.ts): Audits schema parity and column definitions between PostgreSQL and SQLite migration scripts.
- [validate_sql_migrations.ts](./validate_sql_migrations.ts): Tests in-memory execution of all PostgreSQL-translated SQL migrations in SQLite and validates migration timestamp monotonicity.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
