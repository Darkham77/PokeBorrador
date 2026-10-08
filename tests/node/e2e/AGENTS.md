# Purpose

Node.js unit tests for Playwright E2E simulation infrastructure, checkpoint manager persistence, and suite continuation algorithms.

## Ownership

Poké Vicio Development Team.

## Local Contracts

- **Deterministic In-Memory Fixtures**: E2E infrastructure unit tests must verify checkpoint recording and progression algorithms without requiring active browser instances or mutating disk checkpoints.
- **Checkpoint File Isolation**: Tests exercising checkpoint managers during parallel test runs must use isolated paths via `process.env.E2E_CHECKPOINT_FILE_PATH` sanitized against path traversal (CWE-22) to prevent race conditions on shared scratch files.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
