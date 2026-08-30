# Purpose

Automation scripts for database backup, restoration, updates, migrations generation, test seeding, and validation.

## Local Contracts

- **Explicit Named Flags Mandate**: All database scripts accept named options via `node:util parseArgs`:
  - `backup_supabase_db.ts` (`npm run servers:db:backup [server=<profile> | all]`)
  - `restore_supabase_db.ts` (`npm run servers:db:restore server=<profile> [file=<path>]`)
  - `update_supabase_db.ts` (`npm run servers:db:update [server=<profile> | all]`)
  - `import_backup_to_sqlite.ts` (`npm run servers:db:local-import [server=<profile> | file=<path>]`)
- **Build-First Mandate**: Database updates (`npm run servers:db:update`) sync `app_version` and `db_version` into `system_config`. The client MUST always be built (`npm run build`) before running database updates to ensure version parity between the frontend client and remote database.
- All scripts MUST support `--help` flag with clear ANSI formatted usage instructions.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
