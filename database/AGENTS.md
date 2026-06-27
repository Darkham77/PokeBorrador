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

## Verification

- Run `npm run validate:sql` to verify database schemas against the SQLite local environment.

## Child DOX Index

- [backups/](./backups/): Database backups.
- [migrations/](./migrations/): Schema versioning migrations.
- [schemas/](./schemas/): Full schema definitions.
- [temp/](./temp/): Work temporary cache.
