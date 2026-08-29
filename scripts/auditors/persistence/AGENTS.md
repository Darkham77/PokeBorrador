# scripts/auditors/persistence/AGENTS.md

## Purpose & Scope

This directory contains database migration integrity, SQL dialect translation, and player save schema validators.

## Directory Structure & Files

- [_testDbHelper.ts](./_testDbHelper.ts): Shared test database setup and base schema initialization for persistence validators.
- [validate_save_migrations.ts](./validate_save_migrations.ts): Executes SQL migrations sequentially and validates player save compatibility.
- [validate_sql_migrations.ts](./validate_sql_migrations.ts): Tests in-memory execution of all PostgreSQL-translated SQL migrations in SQLite.

## Local Governance & Rules

- Zero runtime database fallbacks: all schema evolutions must be verified via static SQL migrations.
- All auditors in this family must adhere to the `StandardAuditResult` contract.
