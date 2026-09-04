# Purpose

Unit tests for custom maintenance auditors, static code scanners, and performance validation scripts.

## Ownership

Developer Tooling & Codebase Quality Team.

## Directory Structure & Files

- [validate_audit_headers.test.ts](./validate_audit_headers.test.ts): Unit tests for illegal audit headers & file-level suppressions validator.
- [validate_component_styles.test.ts](./validate_component_styles.test.ts): Unit tests for component styles and SCSS orphan validator.
- [validate_o1_data_structures.test.ts](./validate_o1_data_structures.test.ts): Unit tests for O(1) data structure lookups and catalog performance.
- [validate_native_paths.test.ts](./validate_native_paths.test.ts): Unit tests for security and path integrity auditor.

## Local Contracts

- Test pattern detection rules, false-positive prevention, and escape hatch annotations (`// o1-ok: O(1) data structure exception`, `// linear-search-ok: Small bounded collection linear lookup`, `// path-ok`).
- Ensure all tests run deterministically in Vitest Node environment without external dependencies.
