# Purpose

Manage local/offline database schemas, seeds, and SQL migration logic.

## Ownership

Backend / Database Engineers.

## Local Contracts

- DBRouter coordination for local persistence.
- Zero Postgres PL/pgSQL constructs in local migrations.

## Work Guidance

- Client-side SQLite WASM engines do not support PG constructs (`CREATE FUNCTION`, `DROP FUNCTION`). The schema translator must intercept and strip these statements to keep migration files clean.
- Ensure all SQLite files are generated and tested locally before committing.
- Do not run heavy SQL tests on trivial modifications.
- **SQLite Expression Term Limits**: Avoid deep nested JSON subqueries (e.g., nested `json_set` and `json_group_array` over thousands of rows) in SQLite migration files, as they exceed SQLite's tree term/recursion depth limits. Prefer flat UPDATE operations using `replace()` on the raw text content grouped in batches of 50.
- **No Runtime Sanitization Patches**: It is strictly forbidden to implement runtime data patches, sanitizers, or adapters in application code (e.g. inside save loading or initialization hooks) to dynamically fix legacy identifiers. All data structure updates and identifier migrations MUST be executed exclusively via proper SQL database migration scripts (PostgreSQL and SQLite companion scripts) to preserve database cleanliness and prevent application bloat.
- **SQL Parity Validation**: Always run and validate dual-file migrations (`.sql` + `.sqlite.sql`) using native SQLite engines before database commits (e.g., via `npm run validate:sql`).
- **Database Migrations Integrity**: Migration SQL scripts updating serialized JSON state must use valid Dex values (e.g., standard lowercase natures like `'hasty'`). Setting or re-introducing pseudo-states like `'active'` in nature columns is strictly prohibited.
- **Fetch Type Casting**: When passing raw binary exports (`Uint8Array`) as the request body in fetch calls (such as in local SQLite sync services), cast the payload using `binary as unknown as BodyInit` to satisfy compiler signature checks.

## Verification

- Run `npm run validate:sql` to verify database schemas against the SQLite local environment.

## Reference Manuals

- [dbrouter_manual.md](../.agents/skills/project-standards/references/technical/dbrouter_manual.md): Context routing boundaries between Online and Offline.
- [save_system_manual.md](../.agents/skills/project-standards/references/technical/save_system_manual.md): Game persistence configurations.

## Child DOX Index

- [backups/](./backups/): Database backups.
- [migrations/](./migrations/): Schema versioning migrations.
- [schemas/](./schemas/): Full schema definitions.
- [temp/](./temp/): Work temporary cache.
