# Purpose

Manage the logic and assets of db.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **E2E Mode & In-Memory Storage Contract**: `DBRouter` mode determination is strictly derived from `globalThis.__E2E__`, `window.__E2E__`, or `process.env.VITE_E2E === 'true'`. When `isE2E` is true, `DBRouter` operates strictly in `offline` mode with `inMemory: true` SQLite storage.
- **Safe Browser APIs Guard**: When accessing browser globals (`localStorage`, `sessionStorage`, `navigator`) in dual-context code (Node.js unit tests vs Browser runtime), always guard access with explicit optional checks (`typeof window !== 'undefined' && window.localStorage`) to prevent `TypeError` crashes in headless test runners.
- **DBRouter Time Mocking Contract**: `setMockTime(dateStr)` must accept and safely parse ISO strings with timezone offsets, plain datetimes (`datetime-local` format without offsets), plain date strings (`YYYY-MM-DD`), and epoch millisecond timestamps, converting plain dates via `GAME_TIMEZONE` into a valid `Temporal.Instant` without throwing instant string format errors.
- **Dev Database Bridge & Simulation Database Isolation**: The Vite dev database export bridge (`/api/dev-export-db` via `canUseDevDatabaseBridge`) is strictly reserved for ephemeral in-memory simulations (`window.__GTS_SIMULATION__ === true`) and isolated in `database/temp/simulations/`. Manual backup imports exclusively utilize the dedicated file `database/temp/manual_user_backup_import.db` via `/api/dev-manual-import-*`. Real user storage (`pokevicio_sqlite_v2`) is strictly isolated and NEVER contaminated or automatically overwritten by tests or simulations.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [rpcEmulations/](./rpcEmulations/AGENTS.md): Domain module documentation for rpcEmulations.
