# Purpose

Node-level unit and integration tests for map tile registries, coordinate translations, autotiling, and world generation mechanics.

## Ownership

Testing / QA Engineers.

## Local Contracts

- Vitest tests must run cleanly under Node.js 26+ native runner (`npm run test:node`).
- Deterministic, self-contained assertions with zero external network or filesystem mutation side-effects.
- 100% type-safe imports with explicit `.ts` relative extensions.

## Work Guidance

- Test tile mapping validity, coordinate boundaries, elevation constants, and sprite registry lookups.

## Verification

- `npm run test:node -- tests/node/map/` must pass 100% with exit code 0.

## Reference Manuals

- [tests/node/AGENTS.md](../AGENTS.md): Node test execution and deterministic scoping rules.
