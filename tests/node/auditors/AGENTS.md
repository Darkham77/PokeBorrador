# Purpose

Unit tests for custom maintenance auditors, static code scanners, and performance validation scripts.

## Ownership

Developer Tooling & Codebase Quality Team.

## Local Contracts

- Test pattern detection rules, false-positive prevention, and escape hatch annotations (`// o1-ok`, `// linear-search-ok`).
- Ensure all tests run deterministically in Vitest Node environment without external dependencies.
