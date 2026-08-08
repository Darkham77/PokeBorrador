# Testing & Simulation Guidelines

This document governs CLI-first debugging, E2E Playwright simulations, fuzzer parity, logging standards, and test safety rules across the Poké Vicio repository.

## 1. Mandatory Inheritance, Polymorphism & Zero Duplication

- It is STRICTLY FORBIDDEN to duplicate logic, structures, components, or control flows anywhere in the codebase (tests, frontend, or backend).
- If implementing functionality similar to an existing one, refactor first to extract a common abstract base class, parameterized composable, or generic extensible component. Stop before writing any new code and ask: *Can I use inheritance and polymorphism to reuse existing logic here?*

## 2. Bug Reproduction Unit Test Mandate

- Whenever a bug is presented with a reproducing example, you MUST FIRST create a unit test (or other appropriate test setup) that successfully reproduces the bug (verifying it fails) before implementing the fix. This guarantees regression protection.
- Non-trivial logic leaves ONE runnable check behind — the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

## 3. Logging Standards (`console.debug`)

- The use of `console.log` is strictly discouraged for diagnostics, E2E tracing, and automated test checkpoints.
- Developers and agents MUST use `console.debug` (or specific logger levels like `logger.debug`/`logger.warn` if available) for any technical logging that is only useful during development or test execution. This prevents polluting the production/runtime console.

## 4. CLI-First Debugging

- **Console Commands First**: When simulating game states or testing conditional UI (e.g., money, levels, map dominance), ALWAYS prioritize using the `window.__VITE_DEBUG__` console commands over manual GUI interaction.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill (`.agents/skills/project-browser-testing/SKILL.md`).

## 5. Playwright & E2E Simulation Standards

- **Mandatory ID-Based UI Selection**: Whenever locating UI components (buttons, modals, cards, inputs, windows) in Playwright tests or E2E simulations, you MUST strictly use unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#modal-close-btn`, etc.). It is STRICTLY FORBIDDEN to locate elements by text content, regex labels, or button text (e.g. `has-text(...)`, `:has-text(...)`, text matching). All interactive UI components in Vue templates MUST have unique, descriptive `id` attributes.
- **Zero-Tolerance Turn Failure (Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn failure MUST immediately abort the simulation with a descriptive error. There are no retries, no silent skips, no spin-loops.
- **Event-Driven Simulation Sync (No Arbitrary Timers)**: It is STRICTLY FORBIDDEN to use arbitrary timeouts (e.g., `page.waitForTimeout` or `setTimeout`) to wait for animations, scene loads, or UI stability during Playwright simulations. Tests MUST remain event-driven by waiting on explicit FSM state/substate transitions and store processing flags (`store.currentFsmState`, `!store.isProcessing`).
- **Prohibition on FSM State Manipulation & Pointer Overrides**: It is STRICTLY FORBIDDEN to hardcode FSM state transitions or manually manipulate FSM state variables to make E2E simulations pass. It is also STRICTLY FORBIDDEN to use force-click overrides (`{ force: true }`) or arbitrary delays to bypass pointer event blockages.
- **Strict Simulation Timeout Limits**: Per-action timeout is strictly capped at 5s (`MAX_PER_ACTION_TIMEOUT_MS = 5000`), and suite total timeout is strictly capped at 3 minutes (`MAX_SUITE_TOTAL_TIMEOUT_MS = 180000`).
- **Prohibition on Modifying Playwright Configuration**: It is STRICTLY FORBIDDEN to modify `playwright.config.ts` (especially the `workers` field) without an explicit user request.

## 6. Mandatory Shared Code & Parity

- **100% Shared Execution Code**: Headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E browser simulations MUST import and execute the LITERALLY SAME shared battle execution module (`showdownExecutor.ts`, `showdownBattleRunner.ts`). Code duplication, parallel implementations, or divergent choice handling logic between headless replayers and browser simulations are strictly forbidden.
- **Zero-Untested Goal Principle**: Coverage goals cannot be declared completed if even one move, ability, or item is reported as `UNTESTED` in fuzzer outputs.
- **Infinite Punching Bag Pattern**: Silent health maintenance in simulator instances during fuzzing to prevent battles from ending prematurely due to rapid fainting.

## 7. Mandatory Holistic Diagnosis Protocol

Whenever an E2E simulation or Playwright test fails:
1. **Stop & Analyze**: Analyze the complete error stack trace, FSM state transition logs, and active combatant states without jumping to code edits.
2. **Audit Architectural Boundaries**: Read relevant DOX contracts (`AGENTS.md`) and verify the architectural design of the involved components before making changes.
3. **Reproduce via Minimal Unit Test**: Create or update a minimal, isolated unit test under `tests/node/` or `tests/unit/` reproducing the exact failure before modifying `src/`.
4. **Fix at Upstream Source**: Apply the fix cleanly at the true root cause in `src/` without introducing compatibility adapters, fallback assignments, or artificial overrides.

## 8. Anti-Hasty-Patch & Pre-Commit Audit

- **Absolute Prohibition on Rushed Simulation Patches & Fallbacks**: It is STRICTLY FORBIDDEN to apply hasty patches, ad-hoc fallback values, synthetic choice overrides (e.g. forcing `'move 1'`, swallowing missing data), or silent catch blocks (`.catch(() => true)`). Any deviation of state, move availability, or choice rejection MUST result in a clear, immediate test/runtime failure (`throw new Error(...)`) to expose parity bugs at the source.
- **Pre-Commit Audit**: Running `npm run audit:warnings-diff` is mandatory before any commit operation to guarantee 0 errors and 0 new warnings compared to `origin/main`.
