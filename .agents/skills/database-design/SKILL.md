---
name: database-design
description: Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Database Design

> **Learn to THINK, not copy SQL patterns.**

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

| File | Description | When to Read |
| :--- | :--- | :--- |
| `references/database-selection.md` | PostgreSQL vs Neon vs Turso vs SQLite | Choosing database |
| `references/orm-selection.md` | Drizzle vs Prisma vs Kysely | Choosing ORM |
| `references/schema-design.md` | Normalization, PKs, relationships | Designing schema |
| `references/indexing.md` | Index types, composite indexes | Performance tuning |
| `references/optimization.md` | N+1, EXPLAIN ANALYZE | Query optimization |
| `references/migrations.md` | Safe migrations, serverless DBs | Schema changes |

---

## ⚠️ Core Principle

- **Ask** the user for database preferences when unclear.
- **Choose** database/ORM based on context.
- **Avoid** defaulting to PostgreSQL for everything.

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

- **Forced Sync**: To update an existing local SQLite database, always add a new SQL migration to `database/migrations/` and run the build script to regenerate the internal migrations data.
- **Casing Parity**: SQLite column names MUST match the casing and property names of the JavaScript payloads (e.g., camelCase vs snake_case) to avoid insertion errors during property mapping.
- **Dynamic In-Memory SQL Dialect Translation**: To maintain compatibility between local offline validation engines (which execute migrations against SQLite) and advanced remote execution (Postgres), preserve pure SQLite syntax in the `.sql` migration files on disk. In the automated migration runners, intercept and dynamically translate incompatible statements in memory (e.g., adding `CASCADE` to `DROP TABLE` or casting text dates to `TIMESTAMPTZ`) before executing them on Postgres.

---

## Anti-Patterns

- **Avoid defaulting** to PostgreSQL for simple apps (SQLite may suffice).
- **Reject skipping** indexing.
- **Avoid using** `SELECT *` in production.
- **Reject storing JSON** when structured data is better.
- **Identify and fix** N+1 queries.
