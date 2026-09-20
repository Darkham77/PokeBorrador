---
name: database-design
description: Database design principles and decision-making. Schema design, indexing strategy, SQL migrations, dual SQLite/PostgreSQL architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Database Design

> **Learn to THINK, not copy SQL patterns.**

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

| File | Description | When to Read |
| :--- | :--- | :--- |
| `references/database-selection.md` | PostgreSQL vs SQLite WASM vs Supabase | Choosing database |
| `references/schema-design.md` | Normalization, PKs, relationships | Designing schema |
| `references/indexing.md` | Index types, composite indexes | Performance tuning |
| `references/optimization.md` | N+1, EXPLAIN ANALYZE | Query optimization |
| `references/migrations.md` | Safe migrations, dual-engine sync | Schema changes |

---

## ⚠️ Core Principle

- **Ask** the user for database preferences when unclear.
- **Choose** database engine based on context.
- **Avoid** defaulting to single-engine assumptions when dual persistence is required.

---

## Decision Checklist

Before designing schema:

- [ ] Asked user about database preference?
- [ ] Chosen database for THIS context?
- [ ] Considered deployment environment?
- [ ] Planned index strategy?
- [ ] Defined relationship types?
- [ ] Verified local vs online schema parity?

---

## Local Engine Sync (SQLite/WASM)

When modifying the database in a project with a local engine:

- **Absolute Immutability of Historical Migrations**: Migration files in `database/migrations/` (`.sql` and `.sqlite.sql`) already committed and pushed to `main` (or run in production) are **STRICTLY IMMUTABLE**. Never modify past migrations. Existing databases have already recorded them in `_migrations` and will NEVER re-execute them. Any schema modification, fix, or column addition MUST ALWAYS be a NEW forward-only timestamped migration file.
- **Forced Sync**: To update an existing local SQLite database, always add a new SQL migration to `database/migrations/` and run `npm run database:generate-migrations` to regenerate the internal migrations data.
- **Casing Parity**: SQLite column names MUST match the casing and property names of the JavaScript payloads (e.g., camelCase vs snake_case) to avoid insertion errors during property mapping.
- **Canonical PostgreSQL SSoT & SQLite Companion Compilation**: Migration scripts in `database/migrations/` are authored in canonical PostgreSQL (`.sql`) and compiled via `npm run database:generate-migrations` into companion SQLite (`.sqlite.sql`) scripts for client-side SQLite WASM execution. ORMs (Prisma, Drizzle, Kysely) are strictly prohibited; schema management is 100% native SQL governed by `DBRouter`.

---

## Anti-Patterns

- **NEVER modify historical/pushed migrations** (they will never re-run on existing databases; always create a new forward-only migration).
- **Avoid defaulting** to PostgreSQL for simple apps (SQLite may suffice).
- **Reject skipping** indexing.
- **Avoid using** `SELECT *` in production.
- **Reject storing JSON** when structured data is better.
- **Identify and fix** N+1 queries.
