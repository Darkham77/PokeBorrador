# Purpose

General configuration constants, servers configuration, encyclopedic library information, and ranked reward tables.

## Local Contracts

- **Decoupled Server Configuration**: `servers.defaults.json` provides the canonical baseline tracked in Git. Machine-local active configurations are written to `servers.local.json` (gitignored), ensuring local server setup never causes git merge conflicts.
- **O(1) Dictionary**: Constant-time lookup via `OFFICIAL_SERVERS_BY_ID`.
- **Stable Typed Facade**: `official_servers.ts` provides immutable access to server configurations, loading `servers.local.json` with fallback to `servers.defaults.json`.

## Key Files

- [`official_servers.ts`](./official_servers.ts): Canonical typed facade importing local server configuration with fallback to defaults.
- [`servers.defaults.json`](./servers.defaults.json): Baseline server configuration committed to repository.
- [`servers.local.json.d.ts`](./servers.local.json.d.ts): TypeScript declarations for optional gitignored local configuration.
- [`constants.ts`](./constants.ts): Game and system constants.
- [`libraryData.ts`](./libraryData.ts): Encyclopedic library reference data.
- [`rankedData.ts`](./rankedData.ts): Ranked reward and tier definitions.
- [`weatherFamilies.ts`](./weatherFamilies.ts): Weather family groupings and constants.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
