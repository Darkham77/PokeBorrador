# Simulation Testing Standards & Governance

> **Scope & Authority**: This reference document governs the core testing architecture, test suite taxonomy, multi-engine database parity, concurrency allocation, anti-fragmentation laws, and the mandatory 3-Tier Bug Fixing Protocol assimilated from `@/project-standards`.
>
> 🛑 **Parent Skill**: [game-simulation](../SKILL.md)

---

## 1. Mandatory 3-Tier Bug Fixing Protocol (Unit, Integrity & E2E Simulation)

Whenever ANY bug, regression, or state desynchronization occurs across the project, agents MUST resolve it through the mandatory 3-Tier Bug Fixing Protocol:

### Tier 1: Isolated Unit Test (RED-to-GREEN Reproduction)
- You **MUST FIRST** create an isolated, self-contained unit test in `tests/node/` (pure Node logic) or `tests/unit/` (Vue/JSDOM components) that reproduces the failure deterministically in **RED** before writing or proposing any fix in `src/`.
- The reproduction test MUST **extract and inline all failing data, seeds, and choice streams** (or use a dedicated static JSON fixture under `tests/fixtures/battle/case_xxx.json`). Searching or querying dynamic live fuzzer outputs is strictly forbidden because regenerated fuzzer runs invalidate temporary IDs.
- **Dual Database Mandate**: If the bug touches persistence, SQL queries, schemas, database migrations, or DBRouter, the reproduction unit test MUST be written and executed across **ALL active database engines** (SQLite and PostgreSQL via `describeWithDatabase` from `tests/dbTestHelper.ts`) to reproduce the failure in RED and verify repair in GREEN on both engines.
- Run `npx vitest run <path_to_test>` to confirm the deterministic RED failure.

### Tier 2: Integrity & Integration Test
- You MUST create or update an integration test under `tests/integration/` or `tests/node/` that validates contract boundaries, schema integrity, FSM state machine lifecycle transitions, store roundtrips (`serializeState` -> `validateAndSanitize` -> `updateState`), and `@pkmn/sim` Showdown engine parity.
- For database-related logic, integrity tests MUST assert identical schema structures, constraint enforcement, and query behavior across both SQLite and PostgreSQL.
- This ensures the fix integrates cleanly across module boundaries without generating silent regressions.

### Tier 3: Playwright E2E Simulation (Following `@/game-simulation`)
- For all bugs touching UI interactions, combat choreography, FSM orchestration, or user-facing features, verify and add Playwright E2E simulation cases governed strictly by `@/game-simulation`:
  - **Passive Joystick Law**: Simulators only react to explicit FSM readiness states and typed public application events.
  - **100% ID-Based Locators**: Element selections strictly use `#<id>` or UID/item data attributes.
  - **Strict 10s Per-Action Timeout**: `MAX_PER_ACTION_TIMEOUT_MS = 10000`.
  - **Zero-Timer Synchronization**: 100% event-driven, no polling or sleep loops.
  - **Certified Combat Replay**: Replaying certified cases through the shared `ShowdownBattleRunner`.
  - **Dual Database Persistence Verification**: Dual clean zero pass on both `[1/2 SQLite]` and `[2/2 PostgreSQL]`.

---

## 2. Absolute Prohibition on Tautological Mocking (Zero-Fake-Mock Law)

- **Prohibition on Mocking the System Under Test**: An integration test that mocks the core module it claims to verify is an empty tautology. In `tests/integration/`, mocking the primary execution client (`showdownWorkerClient.ts`, `executeTurnInWorker`, `syncTeamsFromLastWorkerState`, or `canonicalTurnRunner.ts`) is **STRICTLY PROHIBITED**.
- **Real Engine Parity Requirement**: Tests verifying combat parity, turn resolution loops, or worker communication MUST execute against:
  1. Real `@pkmn/sim` instances in `tests/node/` (using canonical battle runners or direct simulator calls), OR
  2. The real Web Worker lifecycle in browser/Playwright E2E simulations (`scripts/e2e/`).
- **Forbidden Mock Signatures**: Any PR or test containing:
  ```typescript
  vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
    showdownWorker: {},
    executeTurnInWorker: vi.fn(...)
  }))
  ```
  is a critical quality breach and must be rejected immediately.
- **Mandatory Tier-3 Certification**: Whenever editing combat execution, FSM turn loops, or worker clients in `src/logic/battle/`, unit tests alone are insufficient. Agents MUST execute at least one Playwright E2E combat simulation (`npm run sim:e2e:combat` or certified fuzzer replay) to prove that the real browser Web Worker initializes and executes turns without crashing.

---

## 3. Strict No-Test Mandate for Documentation

- Running test suites (`npm run test`, `test:node`, Vitest, or E2E Playwright simulations) when only editing `.md` documents, DOX indices, or `.agents/` skill files is **STRICTLY FORBIDDEN**.
- Verification for documentation tasks is strictly limited to `npm run lint:md` and `npm run audit:dox`.
- Running full project audits (`npm run lint` or `npm run audit`) for documentation or skill edits is strictly forbidden.

---

## 4. Hardware-Adaptive Worker Concurrency Mandate

- Multi-process worker pools (master audit runner, safe-commit gatekeeper, asset compression, fuzzer engines, Playwright browser workers) MUST calculate worker capacity dynamically based on available logical cores:
  - **CPU-Heavy Auditor Tasks**: `Math.max(1, Math.floor(availableCpus / 2))`
  - **Multi-Threaded Fuzzer & Browser Testing**: `Math.floor(os.cpus().length / 4)`
- Hardcoding arbitrary static limits (such as a fixed cap of 6) is strictly prohibited.

---

## 5. Multi-Engine Behavioral Parity & Dual-Database Execution Mandate

- **Dual Driver Architecture**:
  - `sqlite` (In-Memory WASM): High-speed database for fast developer iteration, UI synchronization, and combat simulations without external runtime dependencies.
  - `postgres` (Docker Integration): Ephemeral container on port 54329 (`pokevicio-test-postgres`), executing 100% real PL/pgSQL stored procedures, foreign key constraints, and RLS policies.
- **Mandatory Parity**: Migrations, queries, constraints, error handling, and business functionality MUST behave 100% identically across both engines.
- **Strict Serial Database Driver Execution**: Database drivers (SQLite and PostgreSQL) MUST execute strictly in series (`[1/2 SQLite]` followed by `[2/2 PostgreSQL]`), never concurrently. Concurrency is strictly reserved for Playwright browser workers within each active suite.
- **State Isolation & Ephemeral Container Reset**: State persistence differences between in-memory SQLite and Docker PostgreSQL must be neutralized in `BaseSimulation.setup()`. Because SQLite drops and recreates the database file on every test run while the PostgreSQL container remains running in RAM across suites, `BaseSimulation.setup()` systematically purges user-scoped rows before launching tests.
- **Parallel Test Worker Username Isolation**: In Playwright suites where multiple tests run concurrently across parallel worker threads, tests MUST NEVER reuse identical usernames. Each test spec MUST generate or declare unique usernames (`Worker_${workerIndex}`) to prevent database unique key collisions (`profiles_username_key`) during concurrent user registration in PostgreSQL.

---

## 6. Comprehensive Test Suite Architecture, Placement Taxonomy & Anti-Fragmentation

### Strict Test Directory Taxonomy
1. `tests/node/` (Real Node.js Environment): Reserved for server-side logic, database migrations, SQL queries, DBRouter operations, CLI maintenance scripts, fuzzer case replays, and pure backend modules. Never place Vue component tests or DOM-dependent code here.
2. `tests/unit/` (Frontend Unit Suites): Reserved for Vue component tests, composables, frontend stores, and battle math. Operates under `environment: 'node'` by default. Any test file mounting Vue components or touching DOM APIs (`document`, `window`, `HTMLCanvasElement`, `localStorageMock`) MUST declare `// @vitest-environment jsdom` at line 1.
3. `tests/integration/` (Cross-Module Integration): Reserved for multi-module flows, store roundtrips, and bridge parity. Files touching DOM must declare `// @vitest-environment jsdom`.
4. `scripts/e2e/` (Playwright E2E Simulations): Reserved exclusively for browser simulations following `/game-simulation` protocols (`*.simulation.ts`).

### Anti-Fragmentation Standard (Target Size: 300 to 800 Lines)
- Creating dozens of micro-test files (<60 lines) for individual cases is strictly prohibited. Every test file incurs a new Vitest worker thread, Vite transform cache thrashing, and repeated dependency import overhead.
- Consolidate related test scenarios into domain-cohesive test suites with a target size of **300 to 800 lines** (e.g. `fuzzer_reproduced_cases.test.ts`, `stores_domain_suite.spec.ts`).
- Enforced continuously by the official SSoT auditor `validate_test_fragmentation.ts` (`npm run validate:test-fragmentation:summary`) with a 60-line minimum floor.

### Systematic Des-JSDOMization Standard
- Test suites testing pure domain logic, formulas, Pinia stores without UI mounting, or Showdown engine adapters MUST NOT declare `// @vitest-environment jsdom`. Running pure logic under JSDOM introduces unnecessary DOM parser boots (~50s CPU penalty across suites).
- The `validate_test_fragmentation.ts` auditor enforces the `unnecessary-jsdom` rule: any test declaring JSDOM without mounting Vue components (`@vue/test-utils`) is rejected.
- If a non-component test genuinely requires browser globals (such as Web Worker client accessing `self.onmessage`, or simulated browser storage `window.localStorage`), declare an inline justification: `// jsdom-ok: <justification>`.

---

## 7. Sequential Multi-Project Vitest Execution Mandate

- When executing the master test suite (`npm run test`) across multi-project workspaces (`unit` with JSDOM and `node` with SQLite/Docker), the test runner (`scripts/testing/run_tests.ts`) MUST execute projects sequentially (`--project unit` followed by `--project node`) rather than launching all projects concurrently.
- Concurrent execution of both projects creates severe thread pool contention on multi-core systems, triggering artificial timeouts in heavy database migration tests. Sequential project orchestration preserves deterministic execution in seconds without altering test timeouts.

---

## 8. GSAP Animation & Visual Kinematics Testing Standards

- **Synchronous GSAP Mocking in Unit Tests**: Unit tests in `tests/unit/battle/` verifying GSAP action helpers (`combatantActionAnims.ts`, `useBattleCaptureAnimations.ts`) must supply synchronous timeline execution stubs where `awaitAnimation` progresses the timeline to 1 (`anim.progress(1)`) and `tl.add` executes passed action callbacks immediately. This prevents 60s JSDOM ticker stalls while maintaining deterministic assertion on timeline parameters.
- **3-Tier Combat Animation Testing Matrix**:
  - **Tier 1 (Unit)**: Direct verification of GSAP parameters, timeline children, and state flags in isolation.
  - **Tier 2 (Integrity)**: Verification of FSM transitions (`CATCH_PROCESS`, `CATCH_SHAKE`, `CATCH_BREAK`, `FADEOUT_BALL`, `ESCAPE_PROCESS`) and eventBus signals.
  - **Tier 3 (Playwright E2E Simulations)**: Verification in browser context ensuring 0 visual lockups, smooth return to map, and proper HUD settlement under official UI controls.

---

## 9. CLI Safety & Logging Standards

- **Prohibition on Multi-Line Inline Node CLI Commands**: AI agents MUST NEVER run multi-line inline scripts (`npx tsx -e "..."` or `node -e "..."`) in terminal tasks on Windows. All validations and diagnostic checks MUST be executed via dedicated test files or script files in `scripts/` or `scratch/`.
- **Prohibition on Manual PATH Injections**: AI agents are STRICTLY FORBIDDEN from prefixing CLI commands with ad-hoc path variables (e.g. `$env:Path = ...; npm ...`). Commands MUST be executed cleanly and natively (`npm run <script>`, `npx <tool>`, `node <file>`).
- **Logging Standards**: Use `console.debug` (or `logger.debug`/`logger.warn`) instead of `console.log` for diagnostics, E2E tracing, and automated test checkpoints to prevent polluting the production console.
