# Purpose

Manage Node.js unit tests for SQLite database buffer validation and data integrity.

## Ownership

Database & Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Node.js Scope Restriction**: Only headless SQLite tests that execute in native Node.js 26+ environment belong in this directory.
- **Hermetic Memory Database Testing**: Tests must execute in-memory or against isolated SQLite buffer fixtures, with deterministic cleanup after execution.

## Key Files

- [`sqlite_buffer_validator.test.ts`](./sqlite_buffer_validator.test.ts): Unit tests verifying SQLite binary buffer headers, page size boundaries, and corruption detection.
- [`migration_runner_hardening.test.ts`](./migration_runner_hardening.test.ts): Multi-engine unit tests verifying fail-fast atomic transactions and rollback across SQLite and PostgreSQL.
- [`supabase_best_practices_hardening.test.ts`](./supabase_best_practices_hardening.test.ts): Multi-engine unit tests verifying trainer_public_profiles view projection with zero data duplication, RLS isolation on game_saves, private chat isolation, and financial check constraints.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and 100% test coverage.

## Verification

- Run suite: `npm run test:node tests/node/db/migration_runner_hardening.test.ts`
- Run lint: `npm run lint`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
