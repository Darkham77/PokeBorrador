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

## 4. Read-Only Diagnostics

- **Read-Only Diagnostics Only**: `window.__VITE_DEBUG__` may inspect state and collect diagnostics, but it MUST NOT advance, confirm, close, select, move, switch, flee, or otherwise mutate gameplay in a simulation. The only combat mutation exception is initialization of a current fuzzer-certified case.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill (`.agents/skills/project-browser-testing/SKILL.md`).

## 5. Playwright & E2E Simulation Standards

- **Mandatory ID-Based UI Selection**: Whenever locating UI components (buttons, modals, cards, inputs, windows) in Playwright tests or E2E simulations, you MUST strictly use unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#modal-close-btn`, etc.). It is STRICTLY FORBIDDEN to locate elements by text content, regex labels, or button text (e.g. `has-text(...)`, `:has-text(...)`, text matching). All interactive UI components in Vue templates MUST have unique, descriptive `id` attributes.
- **Official Keyboard Interaction**: When hover tooltips or pointer affordances keep a focused official control moving, the simulator MUST focus that ID-selected control and activate it with `Enter`. Keyboard activation is a genuine player interaction; it is preferred over force-clicks, coordinate clicks, or synthetic event dispatch.
- **Zero-Tolerance Turn Failure (Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn failure MUST immediately abort the simulation with a descriptive error. There are no retries, no silent skips, no spin-loops.
- **Event-Driven Simulation Sync & Passive Joystick Law**: It is STRICTLY FORBIDDEN to use arbitrary timeouts (`page.waitForTimeout` or `setTimeout`) or invent ad-hoc property heuristics (such as checking `hp === 0` in simulation helpers). Before every visible action, the simulator MUST arm a typed public source event that represents the genuine completion boundary, then react to that event only. FSM states may motivate a source event, but tests never poll or inspect them for synchronization.
- **Prohibition on FSM State Manipulation & Pointer Overrides**: It is STRICTLY FORBIDDEN to hardcode FSM state transitions or manually manipulate FSM state variables to make E2E simulations pass. It is also STRICTLY FORBIDDEN to use force-click overrides (`{ force: true }`) or arbitrary delays to bypass pointer event blockages.
- **Strict Simulation Timeout Limits & Immutable Law**: Per-action timeout is strictly capped at 5s (`MAX_PER_ACTION_TIMEOUT_MS = 5000`). It is **STRICTLY PROHIBITED** to modify, inflate, or alter timeout constants (the 5s per-action timeout, suite total timeouts, or locator timeouts) WITHOUT explicit prior user permission or an explicit technical justification requested from the user. EVERYTHING MUST ALWAYS BE DRIVEN EXCLUSIVELY BY TYPED PUBLIC EVENTS. **A PER-ACTION TIMEOUT IS NEVER A TIME SHORTAGE**: if a UI action or its completion event reaches 5s, it exposes a structural bug, uninitialized store state, unrendered component, or unfulfilled reactive condition. The agent MUST fix that root cause in `src/` rather than inflating, bypassing, or retrying the action.
- **Prohibition on Modifying Playwright Configuration**: It is STRICTLY FORBIDDEN to modify `playwright.config.ts` (especially the `workers` field) without an explicit user request.
- **Certified Combat Replay Contract**: Every Playwright simulation that enters combat MUST replay one current fuzzer-certified case. It consumes the same seed, atomic `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the same `ShowdownBattleRunner` used by the headless replayer. The sole mutation exception initializes that certified starting scenario; it cannot open, close, confirm, move, select, switch, flee, target, or exit on the simulator's behalf. After initialization, the script translates each recorded action only into its matching visible official control, including bag opening, item selection, targeting, movement, menus, confirmations, and battle exit. Recorded IPB healing is permitted deterministic parity instrumentation, never a substitute for an official UI interaction. A manually constructed combat, manual encounter, or real-AI combat stream is invalid; add a legal objective-driven fuzzer case first. This contract is limited to combat and does not replace non-combat domain simulation rules.

## 6. Mandatory Shared Code & Parity

- **100% Shared Execution Code**: Headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E browser simulations MUST import and execute the LITERALLY SAME shared battle execution module (`showdownExecutor.ts`, `showdownBattleRunner.ts`). Code duplication, parallel implementations, or divergent choice handling logic between headless replayers and browser simulations are strictly forbidden.
- **Zero-Untested Goal Principle**: Coverage goals cannot be declared completed if even one move, ability, or item is reported as `UNTESTED` in fuzzer outputs.

## 7. Infinite Punching Bag (IPB) Lifecycle Law

- **Objective-Scoped IPB Lifecycle Law**: In fuzzer battle execution, Infinite Punching Bag (IPB) healing cheats MUST operate strictly while there are untested moves/abilities remaining in the batch (`hasUntestedItemsAfterTurn === true`). As soon as all moves/abilities in the batch are certified, IPB cheats MUST be immediately deactivated (`ipbActive = false`) for the remainder of the battle, allowing combat to complete naturally until `simBattle.ended === true`. Artificial turn limits, synthetic truncations, or keeping IPB cheats active post-testing are strictly prohibited.
- **Prohibition on Permanent Cheat Loops**: It is STRICTLY FORBIDDEN to keep IPB cheats active indefinitely until max turn limits. Keeping IPB cheats active indefinitely prevents PP depletion, blocks natural `Struggle` recoil execution, and creates artificial 1000-turn stall loops.

## 8. Mandatory Disk Fuzzer Case Synchronization Before Code Diagnosis

- Whenever a Playwright E2E simulation or replayer throws a desync, unexpected turn overflow, or step mismatch, the agent MUST FIRST verify if `scripts/e2e/results/fuzzer_certified_cases.json` is 100% up to date with the latest fuzzer logic by executing `npm run sim:fuzzer` BEFORE forming any diagnostic hypothesis or making edits to `src/` or simulation wrappers.
- Attempting to debug or patch runtime synchronization logic against stale or un-regenerated certified case artifacts on disk is STRICTLY FORBIDDEN.

## 9. Mandatory Holistic Diagnosis Protocol

Whenever an E2E simulation or Playwright test fails:
1. **Stop & Analyze**: Analyze the complete error stack trace, FSM state transition logs, and active combatant states without jumping to code edits.
2. **Audit Architectural Boundaries**: Read relevant DOX contracts (`AGENTS.md`) and verify the architectural design of the involved components before making changes.
3. **Reproduce via Minimal Unit Test**: Create or update a minimal, isolated unit test under `tests/node/` or `tests/unit/` reproducing the exact failure before modifying `src/`.
4. **Fix at Upstream Source**: Apply the fix cleanly at the true root cause in `src/` without introducing compatibility adapters, fallback assignments, or artificial overrides.

## 8. Anti-Hasty-Patch & Pre-Commit Audit

- **Absolute Prohibition on Rushed Simulation Patches & Fallbacks**: It is STRICTLY FORBIDDEN to apply hasty patches, ad-hoc fallback values, synthetic choice overrides (e.g. forcing `'move 1'`, swallowing missing data), or silent catch blocks (`.catch(() => true)`). Any deviation of state, move availability, or choice rejection MUST result in a clear, immediate test/runtime failure (`throw new Error(...)`) to expose parity bugs at the source.
- **Pre-Commit Audit**: Running `npm run audit:warnings-diff` is mandatory before any commit operation to guarantee 0 errors and 0 new warnings compared to `origin/main`.
