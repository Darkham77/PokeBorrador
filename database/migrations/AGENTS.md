# Purpose

Manage the logic and assets of migrations.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- **Monotonic Timestamp Ordering**: Every migration file MUST follow the strict timestamp naming convention `YYYYMMDDHHmmss_<name>.sql` (PostgreSQL) and `YYYYMMDDHHmmss_<name>.sqlite.sql` (SQLite).
- **Immutable Ledger Protection**: Never edit or re-use migration IDs that have already been executed on any database environment. To apply fixes or new changes, always create a new migration with a strictly higher monotonic timestamp.
- **db_version Synchronization**: The filename timestamp MUST match the `db_version` value inserted into `system_config` within the SQL script.
- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
