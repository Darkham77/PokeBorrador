# Purpose

Node runtime unit and integration tests for asset bounding boxes, sprite geometry calculation, and asset catalog builders.

## Ownership

Asset Pipeline Engineers / Quality Assurance.

## Local Contracts

- Tests under `tests/node/assets/` must be 100% deterministic and self-contained.
- Avoid runtime dependence on uncommitted or external network sprite sources.
- **Historical Regression Fixtures**: Never use dynamic `git show HEAD:...` for historical parity checks; once committed, HEAD becomes the modified snapshot. Historical regression tests must assert against immutable frozen fixtures in `tests/fixtures/assets/`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
