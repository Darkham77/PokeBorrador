# Purpose

Database, environment configurations, and application store mapping contracts.

## Ownership

Core Infrastructure Team / System Architects.

## Local Contracts

- **Zero-Any Typing**: System types must be strictly typed without naked any or unknown casts.
- **Branded Types**: Core identifiers must derive from `branding.ts`.

## Directory Structure & Files

- `branding.ts`: Branded type primitives and type branding helpers for domain IDs.
- `database.ts`: General database connection, client, and persistence interfaces.
- `debug.ts`: Debug configuration types, sandbox flags, and developer tooling interfaces.
- `env.d.ts`: TypeScript ambient declarations for Vite environment variables and globals.
- `game.ts`: Game configuration, lifecycle states, and core system options.
- `gameEvents.ts`: Global game event bus signal payloads and event types.
- `result.ts`: Generic Result<T, E> type contracts for safe error handling.
- `stores.ts`: Pinia store mapping types and store state interfaces.
- `time.ts`: Temporal epoch, server time, and synchronization type contracts.

## Verification

- Run standard type checks (`npm run lint`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
