# Testing & Simulation Rules

> **Scope & Authority**: This document governs **unit, integration, and general testing architecture, test directory taxonomy, anti-fragmentation standards, des-JSDOMization, sequential multi-project Vitest execution, and zero-fake-mock integration laws** across Poké Vicio.
>
> 🛑 **E2E Playwright & Fuzzer Single Source of Truth (SSoT)**:
> All E2E Playwright browser simulation rules, passive joystick law, 10s per-action timeout limits, `#id`/UID locators, Showdown fuzzer history schemas, Infinite Punching Bag (IPB) lifecycle, dual-driver execution, and the canonical 7-step repair cycle are governed strictly and exclusively by:
> 👉 **[`@/game-simulation`](../../../game-simulation/SKILL.md)** and its specialized modules in `references/`.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For step-by-step browser QA procedures and DevTools console commands ➔ See [Browser Testing Manual](../qa/browser_testing_manual.md).
> - For battle engine execution details and Showdown parity ➔ See [Battle Mechanics Manual](../battle/battle_mechanics_manual.md).
> - For full verification checklists and release gates ➔ See [Audit Checklist](../qa/audit_checklist.md).

---

## 1. Mandatory Inheritance, Polymorphism & Zero Duplication

- It is STRICTLY FORBIDDEN to duplicate logic, structures, components, or control flows anywhere in the codebase (tests, frontend, or backend).
- If implementing functionality similar to an existing one, refactor first to extract a common abstract base class, parameterized composable, or generic extensible component. Stop before writing any new code and ask: *Can I use inheritance and polymorphism to reuse existing logic here?*

---

## 2. Mandatory 3-Tier Bug Fixing Protocol (Unit, Integrity & Playwright Simulation)

Whenever ANY bug, regression, or state desynchronization occurs across the project, you MUST resolve it through the mandatory 3-Tier Bug Fixing Protocol:

1. **Tier 1: Isolated Unit Test (RED-to-GREEN Reproduction)**:
   - You **MUST FIRST** create an isolated, self-contained unit test in `tests/node/` (pure Node logic) or `tests/unit/` (Vue/JSDOM components) that reproduces the failure deterministically in **RED** before writing or proposing any fix in `src/`.
   - The reproduction test MUST **extract and inline all failing data, seeds, and choice streams** (or use a dedicated static JSON fixture under `tests/fixtures/battle/`). Searching or referencing dynamic live fuzzer outputs is strictly forbidden because regenerated fuzzer runs invalidate temporary IDs.
   - **Dual Database Mandate**: If the bug touches persistence, SQL queries, schemas, database migrations, or DBRouter, the reproduction unit test MUST be written and executed across **ALL active database engines** (e.g. SQLite and PostgreSQL via `describeWithDatabase` from `tests/dbTestHelper.ts`) to reproduce the failure in RED and verify repair in GREEN on both engines.
   - Run `npm run test:node -- <path_to_test>` (or `npm run test:unit -- <path_to_test>`) to confirm the deterministic RED failure.
2. **Tier 2: Integrity & Integration Test**:
   - You MUST create or update an integration test under `tests/integration/` or `tests/node/` that validates contract boundaries, schema integrity, FSM state machine lifecycle transitions, store roundtrips (`serializeState` -> `validateAndSanitize` -> `updateState`), and `@pkmn/sim` Showdown engine parity.
   - For database-related logic, integrity tests MUST assert identical schema structures, constraint enforcement, and query behavior across both SQLite and PostgreSQL.
   - This ensures the fix integrates cleanly across module boundaries without generating silent regressions.
3. **Tier 3: Playwright E2E Simulation (Delegated to `@/game-simulation`)**:
   - For all bugs touching UI interactions, combat choreography, FSM orchestration, or user-facing features, verify and add Playwright E2E simulation cases governed strictly by the Single Source of Truth in [`@/game-simulation`](../../../game-simulation/SKILL.md) and its [Simulation Directives Reference](../../../game-simulation/references/simulation_directives_and_invariants.md):
     - Passive Joystick Law & 100% ID-Based / UID-Based locators.
     - Strict 10s per-action timeout limit (`MAX_PER_ACTION_TIMEOUT_MS = 10000`).
     - Zero-timer synchronization coordinated with GSAP animations.
     - Certified combat replays through the shared `ShowdownBattleRunner`.
     - Dual-driver certification on both `[1/2 SQLite]` and `[2/2 PostgreSQL]`.

---

## 3. Logging Standards (`console.debug`)

- The use of `console.log` is strictly discouraged for diagnostics, E2E tracing, and automated test checkpoints.
- Developers and agents MUST use `console.debug` (or specific logger levels like `logger.debug`/`logger.warn` if available) for any technical logging that is only useful during development or test execution. This prevents polluting the production/runtime console.

---

## 4. Read-Only Diagnostics

- **Read-Only Diagnostics Only**: `window.__VITE_DEBUG__` may inspect state and collect diagnostics, but it MUST NOT advance, confirm, close, select, move, switch, flee, or otherwise mutate gameplay in a simulation. The only combat mutation exception is initialization of a current fuzzer-certified case.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill (`.agents/skills/project-browser-testing/SKILL.md`).

---

## 5. E2E Playwright Simulations & Fuzzer Oracle Delegation

> [!IMPORTANT]
> **Single Source of Truth Delegation**:
> All detailed rules, architectures, and directives for Playwright E2E simulations and the Showdown fuzzer pipeline have been consolidated into **[`@/game-simulation`](../../../game-simulation/SKILL.md)** to eliminate documentation duplication and preserve architectural integrity.
>
> Please consult the canonical reference modules:
> - **[Simulation Directives & Invariants](../../../game-simulation/references/simulation_directives_and_invariants.md)**: Passive joystick law, 10s timeout, `#id` locators, history schema, legality, PP conservation, flee rules, visual visibility assertions (`.toBeVisible()`).
> - **[Fuzzer Architecture & Heuristics](../../../game-simulation/references/fuzzer_architecture_and_heuristics.md)**: Capa 0 fuzzer, IPB lifecycle, cooperative heuristics, 7-pillar worker reset (`WorkerSessionPool`).
> - **[CLI & Troubleshooting](../../../game-simulation/references/cli_and_troubleshooting.md)**: NPM scripts, headless replayer, mass debugging, Docker auto-start, port 5174 isolation, rules for modifying tests vs `src/`.
> - **[Simulation Testing Standards](../../../game-simulation/references/simulation_testing_standards.md)**: Dual database execution, hardware-adaptive concurrency, no-test mandate for docs.

---

## 6. Comprehensive Test Suite Architecture, Placement Taxonomy & Performance Standards

- **Strict Test Directory Taxonomy**:
  1. `tests/node/` (Real Node.js Environment): Reserved for server-side logic, database migrations, SQL queries, DBRouter operations, CLI maintenance scripts, fuzzer case replays, and pure backend modules. Never place Vue component tests or DOM-dependent code here.
  2. `tests/unit/` (Frontend Unit Suites): Reserved for Vue component tests, composables, frontend stores, and battle math. Operates under `environment: 'node'` by default. Any test file mounting Vue components or touching DOM APIs (`document`, `window`, `HTMLCanvasElement`, `localStorageMock`) MUST declare `// @vitest-environment jsdom` at line 1.
  3. `tests/integration/` (Cross-Module Integration): Reserved for multi-module flows, store roundtrips, and bridge parity. Files touching DOM must declare `// @vitest-environment jsdom`.
  4. `scripts/e2e/` (Playwright E2E Simulations): Reserved exclusively for browser simulations following `/game-simulation` protocols (`*.simulation.ts`).
- **Test Suite Consolidation & Target Size Standard (Anti-Fragmentation Law)**:
  - Creating dozens of micro-test files (<60 lines) for individual cases is strictly prohibited. Every test file incurs a new Vitest worker thread, Vite transform cache thrashing, and repeated dependency import overhead.
  - Consolidate related test scenarios into domain-cohesive test suites with a target size of **300 to 800 lines** (e.g. `fuzzer_reproduced_cases.test.ts`, `stores_domain_suite.spec.ts`, `battle_helpers_and_actions_suite.spec.ts`, `pokemon_domain_logic_suite.test.ts`).
  - Enforced continuously by the official SSoT auditor `validate_test_fragmentation.ts` (`npm run validate:test-fragmentation:summary`) with a 60-line minimum floor, where legitimate standalone process runners, container reuse benchmarks, and isolated Vue SFC view mount specs are explicitly governed via `TEST_FRAGMENTATION_WHITELIST` or inline `// test-fragmentation-ok:` annotations.
- **Systematic Des-JSDOMization Standard & JSDOM Escape Hatch Protocol**:
  - Test suites testing pure domain logic, formulas, Pinia stores without UI mounting, or Showdown engine adapters MUST NOT declare `// @vitest-environment jsdom`. Running pure logic under JSDOM introduces unnecessary DOM parser boots (~50s CPU penalty across suites).
  - The `validate_test_fragmentation.ts` auditor enforces the `unnecessary-jsdom` rule: any test declaring JSDOM without mounting Vue components (`@vue/test-utils`) is rejected.
  - If a non-component test genuinely requires browser globals (such as Web Worker client accessing `self.onmessage`, or simulated browser storage `window.localStorage` / OPFS `navigator.storage`), the test MUST declare an inline justification: `// jsdom-ok: <justification>`.
- **Single Source of Truth (SSoT) for Domain Logic & Zero Duplicate Exports**:
  - Tests and consuming modules MUST import canonical domain helpers strictly from their originating modules (e.g. `pokemonMath.ts` for calculations and effectiveness text, `pokemonLearnset.ts` for legal move lists). Duplicating helpers across utility files creates duplicate export collisions flagged by Fallow and is strictly prohibited.
- **SQLite Memory Pragmas & Atomic Transactions**:
  - In-memory SQLite tests that insert fixtures or execute schema migrations MUST execute inside `BEGIN TRANSACTION;` and `COMMIT;` with memory pragmas (`PRAGMA synchronous = OFF; PRAGMA journal_mode = MEMORY;`).
  - Pre-translated `.sqlite.sql` migration scripts must be executed in bulk via `db.exec(migration.sqlite_sql)` to avoid 10,000+ JavaScript loop iterations.
- **Cross-Platform Vitest Environment Directive (`// @vitest-environment jsdom`)**:
  - To ensure 100% deterministic environment selection across Windows (with `\`) and POSIX (`/`), all tests requiring DOM MUST declare `// @vitest-environment jsdom` at line 1.

---

## 7. Absolute Prohibition on Tautological Mocking (Zero-Fake-Mock Law)

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
  is considered a critical quality breach and must be rejected immediately.
- **Mandatory Tier-3 Certification**: Whenever editing combat execution, FSM turn loops, or worker clients in `src/logic/battle/`, unit tests alone are insufficient. Agents MUST execute at least one Playwright E2E combat simulation (`npm run sim:e2e:combat` or certified fuzzer replay) to prove that the real browser Web Worker initializes and executes turns without crashing.

---

## 8. Sequential Multi-Project Vitest Execution Mandate

- **Worker Thread CPU Starvation Prevention**: When executing the master test suite (`npm run test`) across multi-project workspaces (`unit` with JSDOM and `node` with SQLite/Docker), the test runner (`scripts/testing/run_tests.ts`) MUST execute projects sequentially (`--project unit` followed by `--project node`) rather than launching all projects concurrently.
- **Root Cause & Parity Protection**: Concurrent execution of both projects creates severe thread pool contention on multi-core systems, triggering artificial timeouts in heavy database migration tests. Sequential project orchestration preserves deterministic execution in seconds without altering test timeouts or masking architectural bottlenecks.

---

## 9. GSAP Animation & Visual Kinematics Testing Standards

- **Synchronous GSAP Mocking in Unit Tests**: Unit tests in `tests/unit/battle/` verifying GSAP action helpers (`combatantActionAnims.ts`, `useBattleCaptureAnimations.ts`) must supply synchronous timeline execution stubs where `awaitAnimation` progresses the timeline to 1 (`anim.progress(1)`) and `tl.add` executes passed action callbacks immediately. This prevents 60s JSDOM ticker stalls while maintaining deterministic assertion on timeline parameters (`duration`, `scale`, `filter`, `x`, `y`, `ease`).
- **3-Tier Combat Animation Testing Matrix**:
  - **Tier 1 (Unit)**: Direct verification of GSAP parameters, timeline children, and state flags in isolation.
  - **Tier 2 (Integrity)**: Verification of FSM transitions (`CATCH_PROCESS`, `CATCH_SHAKE`, `CATCH_BREAK`, `FADEOUT_BALL`, `ESCAPE_PROCESS`) and eventBus audio/visual signals.
  - **Tier 3 (Playwright E2E Simulations)**: Verification in browser context ensuring 0 visual lockups, smooth return to map, and proper HUD settlement under official UI controls.

---

## 10. Event Stream Parity Testing Mandate

- **Chronological Event Stream Verification**: Automated tests for combat animations and FSM lifecycles MUST record and assert an Event Stream to guarantee that withdraw animations, defeat logs, sendout announcements, release animations, and combatant UID mounting execute in strict chronological sequence across single and multi-Pokémon (6v6) encounters, eliminating silent animation drops.

---

## 11. Map Atmosphere & Gym Climate Lifecycle Testing Mandate

- **Environmental, Configurable & Sprite-Aware Atmosphere Testing**: Automated test suites for battle visual atmosphere (`gym_weather_isolation.spec.ts`, `gym_atmosphere_lifecycle_integration.spec.ts`) MUST verify:
  1. **Default Single-Sprite / Gym Isolation**: Standard gyms maintain constant day lighting (`effectiveCycle = 'day'`) and block outdoor weather transitions.
  2. **Configurable Gym/Map Overrides**: Gyms and battles with explicit `fixedCycle: 'night'` or custom `fixedWeather` render their configured atmosphere accurately regardless of real-time ticks.
  3. **Multi-Sprite Responsiveness**: Locations with multi-cycle sprites (open routes and multi-sprite interiors like `mansion`) react dynamically to time changes.
  4. **In-Combat Weather Lifecycle**: Moves and abilities properly cast weather in any arena and cleanly revert upon expiration.
