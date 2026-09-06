# Purpose

Manage the logic and assets of db.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dual Database E2E Mode Contract**: `DBRouter` mode determination is derived from `globalThis.__E2E__`, `window.__E2E__`, or `process.env.VITE_E2E === 'true'`. When `isE2E` is true and `e2eDriver === 'postgres'`, `DBRouter` operates in `online` mode communicating natively with the local Supabase stack in Docker (PostgreSQL 16 + PostgREST 12 on port 54321) via the official `@supabase/supabase-js` client (`this.realClient`) and signed JWT sessions. In default SQLite mode, `DBRouter` operates strictly in `offline` mode with `inMemory: true` SQLite storage.
- **Native Supabase Testing Contract**: Simulations with PostgreSQL operate 100% against PostgREST REST APIs (`/rest/v1/*`), keeping frontend code and Vite completely pure without custom database bridge endpoints. Authentication passes signed JWT tokens containing the test user ID (`sub`) to authenticate natively against PostgreSQL RLS policies.
- **Safe Browser APIs Guard**: When accessing browser globals (`localStorage`, `sessionStorage`, `navigator`) in dual-context code (Node.js unit tests vs Browser runtime), always guard access with explicit optional checks (`typeof window !== 'undefined' && window.localStorage`) to prevent `TypeError` crashes in headless test runners.
- **DBRouter Time Mocking Contract**: `setMockTime(dateStr)` must accept and safely parse ISO strings with timezone offsets, plain datetimes (`datetime-local` format without offsets), plain date strings (`YYYY-MM-DD`), and epoch millisecond timestamps, converting plain dates via `GAME_TIMEZONE` into a valid `Temporal.Instant` without throwing instant string format errors.
- **Dev Database Bridge & Simulation Database Isolation**: The Vite dev database export bridge (`/api/dev-export-db` via `canUseDevDatabaseBridge`) is strictly reserved for ephemeral in-memory simulations (`window.__GTS_SIMULATION__ === true`) and isolated in `database/temp/simulations/`. Manual backup imports exclusively utilize the dedicated file `database/temp/manual_user_backup_import.db` via `/api/dev-manual-import-*`. Real user storage (`pokevicio_sqlite_v2`) is strictly isolated and NEVER contaminated or automatically overwritten by tests or simulations.
- **Static Schema Parity Mandate (`TABLES_SCHEMA` in `src/logic/db/schema.ts`)**: Whenever a new SQL migration creates a table or alters columns in `database/migrations/`, the identical schema definition MUST be added to `TABLES_SCHEMA`. This ensures that new offline SQLite databases seeded from `TABLES_SCHEMA` match migrated databases with 100% structural parity, as verified by `tests/node/system/db_schema_parity.test.ts`.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [rpcEmulations/](./rpcEmulations/AGENTS.md): Domain module documentation for rpcEmulations.
