# Purpose

Automation scripts for database backup, restoration, updates, migrations generation, test seeding, and validation.

## Local Contracts

- **Explicit Named Flags Mandate**: All database scripts accept named options via `node:util parseArgs`:
  - `backup_supabase_db.ts` (`npm run database:backup [server=<profile> | all]`)
  - `restore_supabase_db.ts` (`npm run database:restore server=<profile> [file=<path>]`)
  - `upgrade_backup.ts` (`npm run database:upgrade-backup [server=<profile> | file=<path>]`): Dynamically loads legacy backup JSON files, applies all pending migrations in SQLite, sanitizes Pokémon legality (species names, vigor, HP, moves, abilities), and exports a 100% compatible `<file>_upgraded.json` ready for clean restoration.
  - `update_supabase_db.ts` (`npm run database:update [server=<profile> | all]`)
  - `import_backup_to_sqlite.ts` (`npm run database:local-import [server=<profile> | file=<path>]`)
- **Safe Commit & Version Sync Mandate**: Database updates (`npm run database:update`) sync `app_version` from `public/version.json` and `db_version` into `system_config`. Remote database updates must NEVER be triggered with an uncommitted local `npm run build`, as this causes version mismatches between GitHub Pages deployed clients and the remote database. Always synchronize versions via the official `/safe-commit` workflow.
- **Quote-Aware SQL Comment Stripping**: SQL migration generators and parsers (`generate_migrations.ts`) MUST parse comments using quote-aware token boundaries (`stripInlineComment`). Naive substring searches for `--` that truncate inside single or double-quoted strings (such as CSS `var(--yellow)` or inline JSON text) are strictly prohibited.
- **Unified Argument Parser SSoT (`scripts/lib/supabaseClient.ts`)**: All database scripts (`backup_supabase_db.ts`, `restore_supabase_db.ts`, `update_supabase_db.ts`, `admin_supabase_users.ts`) MUST consume `parseServerArguments(args, baseProfiles, allAvailable)` from `scripts/lib/supabaseClient.ts`. Cross-script dynamic imports for CLI options are strictly prohibited.
- **Unified `database:` NPM Scripts Namespace**: All database maintenance scripts must strictly adhere to the `database:` command namespace in `package.json`. Invocations must use `npm run database:<action> [key=value]`.
- **Dynamic SQL Migration Generators**: Whenever creating migrations depending on game constants (e.g., enabled species whitelist, valid movesets, catalog items), create a generator script under `scripts/database/` that reads canonical TypeScript data and outputs formatted PostgreSQL and SQLite migration pairs.
- All scripts MUST support `--help` flag with clear ANSI formatted usage instructions.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
