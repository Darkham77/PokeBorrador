# Purpose

General configuration constants, servers configuration, encyclopedic library information, and ranked reward tables.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Decoupled Server Configuration**: Active server configurations are written strictly to unversioned `servers.local.json` (gitignored) from `.env` or CI secrets via `npm run servers:configure`. Silent fallbacks and default mock files are strictly forbidden.
- **O(1) Dictionary**: Constant-time lookup via `OFFICIAL_SERVERS_BY_ID`.
- **Stable Typed Facade**: `official_servers.ts` provides immutable access to server configurations, loading `servers.local.json` and failing loudly with a descriptive error if missing or unconfigured.

## Key Files

- [`official_servers.ts`](./official_servers.ts): Canonical typed facade importing local server configuration strictly with zero fallbacks.
- [`servers.local.json.d.ts`](./servers.local.json.d.ts): TypeScript declarations for gitignored local configuration.
- [`constants.ts`](./constants.ts): Game and system constants.
- [`libraryData.ts`](./libraryData.ts): Encyclopedic library reference data.
- [`rankedData.ts`](./rankedData.ts): Ranked reward and tier definitions.
- [`weatherFamilies.ts`](./weatherFamilies.ts): Weather family groupings and constants.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
