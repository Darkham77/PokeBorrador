# Purpose

Automation scripts for database backup, restoration, updates, migrations generation, test seeding, and validation.

## Child DOX Index

- [backup_supabase_db.ts](./backup_supabase_db.ts): Dumps cloud schema and seed data to local backups.
- [restore_supabase_db.ts](./restore_supabase_db.ts): Restores backups to cloud instances.
- [update_supabase_db.ts](./update_supabase_db.ts): Runs Supabase migrations updates.
- [import_backup_to_sqlite.ts](./import_backup_to_sqlite.ts): Synchronizes database backups to local SQLite.
- [generate_migrations.ts](./generate_migrations.ts): Aggregates SQL migration files to ESM manifest.
- [seed_test_users.ts](./seed_test_users.ts): Inserts mock test users into active environments.
- [validate_sql_migrations.ts](./validate_sql_migrations.ts): Checks SQLite migration syntax compatibility.
