# Purpose

Manage automated test specifications and assertions for logic validation schemas and persistence contracts in Node.js environment.

## Ownership

Test Engineers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- Vitest tests under `tests/node/validation/` must be 100% self-contained and deterministic.
- Assert schema validations fail-fast loudly on contract violations.

## Work Guidance

- Test runtime domain schema parsers (`schemas.ts`, GTS, Auth, Save Shield) against valid and invalid payloads.

## Child DOX Index

(No child directories)
