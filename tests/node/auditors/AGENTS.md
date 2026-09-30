# Purpose

Unit tests for host-specific extension sub-auditors in Poké Vicio. Unit tests for generic auditor suites reside in `packages/auditor/tests/`.

## Ownership

Developer Tooling & Codebase Quality Team.

## Directory Structure & Files

- [validate_battle_ui_branching.test.ts](./validate_battle_ui_branching.test.ts): Unit tests for battle UI branching auditor.
- [validate_client_sim_decoupling.test.ts](./validate_client_sim_decoupling.test.ts): Unit tests for client-side `@pkmn/sim` decoupling auditor.
- [validate_save_persistence_parity.test.ts](./validate_save_persistence_parity.test.ts): Unit tests for Pokémon save persistence serialization/deserialization parity.

## Local Contracts

- **Host Extension Test Completeness**: Every host extension sub-auditor declared in `audit.config.ts` MUST have a dedicated test file in this directory (`tests/node/auditors/<suite_filename>.test.ts`).
- **100% Declared Rule Coverage**: Dedicated test cases must explicitly trigger and assert every declared rule ID (`untested-auditor-rule` enforcement).
- **Mandatory Clean Execution Path Verification**: Every test suite MUST include at least one clean verification test asserting zero errors (`expect(result.summary.errors).toBe(0)` and `expect(result.status).toBe('passed')`). Missing clean path checks violate `missing-clean-auditor-test` (severity: error).
- **Hermetic Test Isolation**: Tests MUST use `testScanFile(...)` combined with `await auditor.finishAudit()` or temporary sandbox directories (`fs.mkdtemp`) via `projectRoot`. Direct calls to `auditor.execute()` that scan the live `src/` directory are strictly forbidden in unit tests.
- **Deterministic Vitest Execution**: Ensure all tests run deterministically in Vitest Node environment without external dependencies or live database connections.
