# Purpose

Host-level helper libraries for Poké Vicio, primarily database and environment connection utilities.

## Ownership

Architecture & DevOps Engineers.

## Local Contracts

- **Supabase Client**: Host scripts interact with Supabase instances via `supabaseClient.ts`, supporting multi-server configurations and containerized local Docker environments.
- **Auditor Framework Location**: Core auditor base classes, contracts, streaming runners, and unified themes reside in the standalone workspace package `@francogp/auditor` (`node_modules/@francogp/auditor/`).

## Key Files

- [`supabaseClient.ts`](./supabaseClient.ts): Multi-server Supabase connection and environment resolution helper.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
