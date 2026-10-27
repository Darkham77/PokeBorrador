# Simulation Testing Standards & Dual-Engine E2E Governance

> **Scope & Authority**: This reference document governs **Playwright E2E simulation execution invariants, dual-database (`[1/2 SQLite]` + `[2/2 PostgreSQL]`) serial driver execution, container state isolation, parallel worker username isolation, and real Showdown worker parity**.
>
> 🛑 **Parent Skill**: [game-simulation](../SKILL.md)
>
> 🛑 **Single Source of Truth Delegations**:
>
> - **Universal RED-GREEN First Mandate & 4-Phase Triage** ➔ Governed strictly by **`/architecture`** $\rightarrow$ **`/systematic-debugging`**.
> - **General Vitest Unit/Node/Integration Architecture, Directory Taxonomy (`tests/node/`, `tests/unit/`, `tests/integration/`), Anti-Fragmentation Law (300–800 lines), Des-JSDOMization (`// jsdom-ok:`), Sequential Multi-Project Vitest Execution, and Synchronous GSAP Unit Stubs** ➔ Governed strictly by [Testing & Simulation Rules](../../project-standards/references/rules/testing_and_simulations.md).

---

## 1. Poké Vicio 3-Tier Simulation Verification Summary

In complement to **`/systematic-debugging`** (Gate 1 Inviolable: never modify `src/` without a deterministic RED reproduction test):

1. **Tier 1 (Isolated Unit Test in `tests/node/` or `tests/unit/`)**: Extract and inline failing Showdown fuzzer choice streams (`step.p1Choice`, `step.p2Choice`), `seed`, and `history` (or save to `tests/fixtures/battle/case_xxx.json`) and confirm RED via `npm run test:node <path>`. For DB/persistence bugs, execute across both SQLite and PostgreSQL via `describeWithDatabase`.
2. **Tier 2 (Integrity & Integration Test in `tests/integration/` or `tests/node/`)**: Verify contract boundaries, Valibot schemas, FSM transitions, store roundtrips, and `@pkmn/sim` parity.
3. **Tier 3 (Playwright E2E Simulation via `@/game-simulation`)**: Certify in browser context (Step 6A resume + Step 6B clean pass from zero on both `[1/2 SQLite]` and `[2/2 PostgreSQL]`).

---

## 2. Absolute Prohibition on Tautological Mocking (Zero-Fake-Mock Law)

- **Prohibition on Mocking the System Under Test**: An integration test that mocks the core module it claims to verify is an empty tautology. In `tests/integration/`, mocking the primary execution client (`showdownWorkerClient.ts`, `executeTurnInWorker`, `syncTeamsFromLastWorkerState`, or `canonicalTurnRunner.ts`) is **STRICTLY PROHIBITED**.
- **Real Engine Parity Requirement**: Tests verifying combat parity, turn resolution loops, or worker communication MUST execute against:
  1. Real `@pkmn/sim` instances in `tests/node/` (using canonical battle runners or direct simulator calls), OR
  2. The real Web Worker lifecycle in browser/Playwright E2E simulations (`scripts/e2e/`).
- **Mandatory Tier-3 Certification**: Whenever editing combat execution, FSM turn loops, or worker clients in `src/logic/battle/`, unit tests alone are insufficient. Agents MUST execute at least one Playwright E2E combat simulation (`npm run sim:e2e:combat` or certified fuzzer replay) to prove that the real browser Web Worker initializes and executes turns without crashing.

---

## 3. Multi-Engine Behavioral Parity & Dual-Database Execution Mandate

- **Dual Driver Architecture**:
  - `sqlite` (In-Memory WASM): High-speed database for fast developer iteration, UI synchronization, and combat simulations without external runtime dependencies.
  - `postgres` (Docker Integration): Ephemeral container on port 54329 (`pokevicio-test-postgres`), executing 100% real PL/pgSQL stored procedures, foreign key constraints, and RLS policies.
- **Mandatory Parity**: Migrations, queries, constraints, error handling, and business functionality MUST behave 100% identically across both engines.
- **Strict Serial Database Driver Execution**: Database drivers (SQLite and PostgreSQL) MUST execute strictly in series (`[1/2 SQLite]` followed by `[2/2 PostgreSQL]`), never concurrently. Concurrency is strictly reserved for Playwright browser workers within each active suite.
- **State Isolation & Ephemeral Container Reset**: State persistence differences between in-memory SQLite and Docker PostgreSQL must be neutralized in `BaseSimulation.setup()`. Because SQLite drops and recreates the database file on every test run while the PostgreSQL container remains running in RAM across suites, `BaseSimulation.setup()` systematically purges user-scoped rows before launching tests.
- **Parallel Test Worker Username Isolation**: In Playwright suites where multiple tests run concurrently across parallel worker threads, tests MUST NEVER reuse identical usernames. Each test spec MUST generate or declare unique usernames (`Worker_${workerIndex}`) to prevent database unique key collisions (`profiles_username_key`) during concurrent user registration in PostgreSQL.

---

## 4. Hardware-Adaptive Worker Concurrency & CLI Logging

- **Hardware-Adaptive Concurrency**: Multi-process worker pools calculate capacity dynamically from available logical cores: `Math.max(1, Math.floor(availableCpus / 2))` for CPU-heavy auditor tasks and `Math.floor(os.cpus().length / 4)` for multi-threaded fuzzer/Playwright browser workers. Hardcoding static worker caps is forbidden.
- **No-Test Mandate for Documentation**: Never run `npm run test` or `npm run sim:e2e` when only editing `.md` or skill files; run exclusively `npm run auditor:md`.
- **Logging Standards**: Use `console.debug` (or `logger.debug`/`logger.warn`) instead of `console.log` for E2E tracing and automated test checkpoints to keep the production console clean.
