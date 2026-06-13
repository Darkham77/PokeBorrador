# Purpose

Automation, build processes, diagnostic tools, and utility scripts for the Poké Vicio project.

## Ownership

DevOps / Tooling Engineers.

## Local Contracts

- Strict compliance with Node.js 26+ native execution standards.
- Windows file locking handling (EBUSY errors).

## Work Guidance

- Use `node --experimental-strip-types` paired with Node.js 26+ sandboxed permissions flags (`--permission`) instead of using `tsx` or `ts-node` (which are forbidden).
- Mandate built-in modules prefix (e.g., `node:fs`).
- Exclude the raw assets folders from file watchers in `vite.config.ts` to prevent locking crashes under Windows.
- Save validation/audit outputs and temporary reports strictly inside the root `scratch/` folder.

## Verification

- Execute scripts natively to verify they pass sandboxed permission audits.

## Child DOX Index

This folder contains utility scripts for development, build validation, and project diagnostics:

- **Admin & Config**:
  - [admin_rename.ts](./admin_rename.ts): Renames user profile names directly on Supabase.
  - [admin_supabase_users.ts](./admin_supabase_users.ts): Command-line tool to manage Supabase user accounts.
  - [configure_official_servers.ts](./configure_official_servers.ts): Synchronizes target servers from the master `.env`.
  - [seed_test_users.ts](./seed_test_users.ts): Seeds test trainer profiles.
- **Audit & Validation**:
  - [audit_item_assets.ts](./audit_item_assets.ts): Audits consistency of item IDs and asset sprites.
  - [audit_project.ts](./audit_project.ts): Scans workspace for SASS functions, line limits, and styles.
  - [validate_abilities.ts](./validate_abilities.ts): Validates local abilities data.
  - [validate_fsm_diagrams.ts](./validate_fsm_diagrams.ts), [validate_fsm_flow_parity.ts](./validate_fsm_flow_parity.ts), [validate_fsm_implementation.ts](./validate_fsm_implementation.ts): Core FSM battle mechanics validators.
  - [validate_items.ts](./validate_items.ts): Validates item databases.
  - [validate_moves.ts](./validate_moves.ts): Validates battle moves.
  - [validate_sandbox_moves_tooltip.ts](./validate_sandbox_moves_tooltip.ts): Validates move descriptions in sandbox.
  - [validate_sql_migrations.ts](./validate_sql_migrations.ts): Validates SQL files against SQLite.
- **Asset Pipeline**:
  - [convert_assets.ts](./convert_assets.ts): Lossless optimizer to WebP formats.
  - [download_assets.ts](./download_assets.ts), [download_badges.ts](./download_badges.ts): Asset downloading tools.
  - [optimize_sprites.ts](./optimize_sprites.ts): Compresses sprites.
- **DB Management**:
  - [backup_supabase_db.ts](./backup_supabase_db.ts): Dumps cloud data locally.
  - [generate_migrations.ts](./generate_migrations.ts): Compiles production TS migrations from SQL scripts.
  - [import_backup_to_sqlite.ts](./import_backup_to_sqlite.ts): Bridges cloud back-ups with local SQLite.
  - [restore_supabase_db.ts](./restore_supabase_db.ts): restructures database from local dumps.
  - [update_supabase_db.ts](./update_supabase_db.ts): Pushes migrations to Supabase instances.
- **Maintenance & QA**:
  - [sync_to_test.ts](./sync_to_test.ts): Synchronizes stable snapshots into testing repositories.
  - [vite-plugin-sass-traps.ts](./vite-plugin-sass-traps.ts): Integrates automated Vite traps for SCSS transforms.
