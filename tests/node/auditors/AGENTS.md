# Purpose

Unit tests for custom maintenance auditors, static code scanners, and performance validation scripts.

## Ownership

Developer Tooling & Codebase Quality Team.

## Directory Structure & Files

- [validate_audit_headers.test.ts](./validate_audit_headers.test.ts): Unit tests for illegal audit headers & file-level suppressions validator.
- [auditors_conformance_suite.test.ts](./auditors_conformance_suite.test.ts): Unit tests for component styles, bundle budget, dead CSS, combat invariants, and schema/save parity validators.
- [validate_o1_data_structures.test.ts](./validate_o1_data_structures.test.ts): Unit tests for O(1) data structure lookups and catalog performance.
- [validate_test_fragmentation.test.ts](./validate_test_fragmentation.test.ts): Unit tests for test anti-fragmentation validator and 60-line test floor governance.
- [validate_native_paths.test.ts](./validate_native_paths.test.ts): Unit tests for security and path integrity auditor.

## Local Contracts

- Test pattern detection rules, false-positive prevention, and escape hatch annotations (`// o1-ok: O(1) data structure exception`, `// linear-search-ok: Small bounded collection linear lookup`, `// path-ok`).
- Ensure all tests run deterministically in Vitest Node environment without external dependencies.
