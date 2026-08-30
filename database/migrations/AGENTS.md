# Purpose

Manage the logic and assets of migrations.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- **Monotonic Timestamp Ordering**: Every migration file MUST follow the strict timestamp naming convention `YYYYMMDDHHmmss_<name>.sql` (PostgreSQL) and `YYYYMMDDHHmmss_<name>.sqlite.sql` (SQLite).
- **Immutable Migrations & Forward-Only Default**: By default, existing migration files are immutable once registered. All standard schema evolutions and data fixes MUST be delivered via NEW forward-only migration files with incremented monotonic timestamps.
- **Rollback & Historical Data-Loss Exception**: If a legacy migration caused data loss or destructive corruption and the database is being rolled back to a previous backup/state to replay migrations from that checkpoint, modifying and correcting the faulty historical migration script is explicitly PERMITTED.
- **Immutable Ledger Protection**: Never edit or re-use migration IDs that have already been executed on any database environment in normal forward flows. To apply fixes or new changes, always create a new migration with a strictly higher monotonic timestamp.
- **db_version Synchronization**: The filename timestamp MUST match the `db_version` value inserted into `system_config` within the SQL script.
- **Egg Data Contract Parity in Saves**: In `game_saves.save_data.eggs` (`PokemonEgg`), `id` represents the canonical `PokemonSpeciesId` (e.g. `'charmander'`, `'togepi'`), while `uid` represents the unique instance identifier. Migrations must NEVER overwrite `egg.id` with opaque tokens like `'egg_...'`.
- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
