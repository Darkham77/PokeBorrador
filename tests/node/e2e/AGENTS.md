# Purpose

Node.js unit tests for Playwright E2E simulation infrastructure, checkpoint manager persistence, and suite continuation algorithms.

## Local Contracts

- **Deterministic In-Memory Fixtures**: E2E infrastructure unit tests must verify checkpoint recording and progression algorithms without requiring active browser instances or mutating disk checkpoints.
- **Checkpoint File Isolation**: Tests exercising checkpoint managers during parallel test runs must use isolated paths via `process.env.E2E_CHECKPOINT_FILE_PATH` sanitized against path traversal (CWE-22) to prevent race conditions on shared scratch files.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
