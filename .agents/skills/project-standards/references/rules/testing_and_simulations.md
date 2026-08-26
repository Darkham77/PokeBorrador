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

- **Mandatory ID-Based UI Selection**: Whenever locating UI components (buttons, modals, cards, inputs, windows) in Playwright tests or E2E simulations, you MUST strictly use unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#modal-close-btn`, etc.) or dedicated data attributes (`data-pokemon-uid="${uid}"`, `data-item-id="${id}"`). It is STRICTLY FORBIDDEN to locate elements by text content, regex labels, or button text (e.g. `has-text(...)`, `:has-text(...)`, text matching). All interactive UI components in Vue templates MUST have unique, descriptive `id` attributes.
- **Strict UID-Based Switch Selection in BaseBattleSimulation**: In `base_battle_simulation.ts`, voluntary and forced switch actions (`SWITCH_MENU` / `switch X`) strictly resolve target Pokémon via their canonical `uid` (`switchEntry.p1ActiveUid` or `playerSwitchSlots.find(s => s.showdownSlot === slot).pokemonUid`). The simulation driver locates bench cards exclusively by UID data attributes (`data-pokemon-uid="${targetUid}"`) rather than guessing index offsets or matching text.
- **GSAP Clock & Instant Time-Scaling Parity**: All application animations, transition pauses, and delays use `gsapSleep` (from `@/logic/utils/gsapHelpers`) or GSAP timelines. This enables Playwright and headless battle simulations to scale execution time instantly (`gsap.globalTimeline.timeScale(100)`) without artificial timeouts, while preserving silky 1x playback for real users.
- **Official Keyboard Interaction**: When hover tooltips or pointer affordances keep a focused official control moving, the simulator MUST focus that ID-selected control and activate it with `Enter`. Keyboard activation is a genuine player interaction; it is preferred over force-clicks, coordinate clicks, or synthetic event dispatch.
- **Zero-Tolerance Turn Failure (Strict Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn failure MUST immediately abort the simulation with a descriptive error. There are no retries, no silent skips, and no spin-loops.
- **Passive Joystick Rule & Complete Prohibition on Artificial Delays**: Simulations MUST act strictly as a passive joystick that ONLY reacts to explicit FSM readiness states and typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`). It is STRICTLY FORBIDDEN to use arbitrary delays (`page.waitForTimeout`, `setTimeout`, `sleep`), store/FSM/DOM polling loops, or invent ad-hoc property heuristics (such as checking `hp === 0`). Before every visible action, the simulator MUST arm a typed public source event that represents the genuine completion boundary, then react to that event only with 100% zero-timer synchronization.
- **Prohibition on FSM State Manipulation & Pointer Overrides**: It is STRICTLY FORBIDDEN to hardcode FSM state transitions or manually manipulate FSM state variables to make E2E simulations pass. It is also STRICTLY FORBIDDEN to use force-click overrides (`{ force: true }`) or arbitrary delays to bypass pointer event blockages.
- **Strict Simulation Timeout Limits & Immutable Law (5s Per-Action / Configurable Suite Total Without Hardcoding)**: Per-action timeout is strictly capped at 5s (`MAX_PER_ACTION_TIMEOUT_MS = 5000`). Suite total timeouts must be configurable per suite based on case count and complexity without arbitrary hardcoding. It is **STRICTLY PROHIBITED** to modify, inflate, or alter timeout constants (the 5s per-action timeout, suite total timeouts, or locator timeouts) WITHOUT explicit prior user permission or an explicit technical justification requested from the user. EVERYTHING MUST ALWAYS BE DRIVEN EXCLUSIVELY BY TYPED PUBLIC EVENTS. **A PER-ACTION TIMEOUT IS NEVER A TIME SHORTAGE**: if a UI action or its completion event reaches 5s, it exposes a structural bug, uninitialized store state, unrendered component, or unfulfilled reactive condition. The agent MUST fix that root cause in `src/` rather than inflating, bypassing, or retrying the action.
- **Prohibition on Modifying Playwright Configuration**: It is STRICTLY FORBIDDEN to modify `playwright.config.ts` (especially the `workers` field) without an explicit user request.
- **Certified Combat Replay Contract**: Every Playwright simulation that enters combat MUST replay one current fuzzer-certified case. It consumes the same seed, atomic `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the same `ShowdownBattleRunner` used by the headless replayer. The sole mutation exception initializes that certified starting scenario; it cannot open, close, confirm, move, select, switch, flee, target, or exit on the simulator's behalf. After initialization, the script translates each recorded action only into its matching visible official control, including bag opening, item selection, targeting, movement, menus, confirmations, and battle exit. Recorded IPB healing is permitted deterministic parity instrumentation, never a substitute for an official UI interaction. A manually constructed combat, manual encounter, or real-AI combat stream is invalid; add a legal objective-driven fuzzer case first. This contract is limited to combat and does not replace non-combat domain simulation rules.

## 6. Mandatory Shared Code & Parity

- **100% Shared Execution Code**: Headless fuzzer replayers (`fuzzer_case_replayer.ts`) and Playwright E2E browser simulations MUST import and execute the LITERALLY SAME shared battle execution module (`showdownExecutor.ts`, `showdownBattleRunner.ts` in `src/logic/battle/helpers/showdownBattleRunner.ts`). Code duplication, parallel implementations, or divergent choice handling logic between headless replayers and browser simulations are strictly forbidden.
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

## 10. Mandatory Comprehensive Fuzzer History & Zero-Guesswork Replay

- **Exhaustive History Metadata on Disk**: The fuzzer recorder MUST write complete, unambiguous state and decision metadata directly into `history` entries in `fuzzer_certified_cases.json` (`CertifiedBattleHistoryEntry`). This includes:
  - `p1ActiveUid` and `p2ActiveUid` (explicit active Pokémon UIDs per turn).
  - `p1MoveId` and `p2MoveId` (canonical move IDs executed).
  - `p1LockedMoveId` and `p2LockedMoveId` (locked or recharge move IDs when restricted by Showdown).
  - `p1Trapped` and `p2Trapped` (switching prohibition flags when trapped by ability or move).
  - `p1Volatiles` and `p2Volatiles` (critical active volatiles: `mustrecharge`, `lockedmove`, `twoturnmove`, `taunt`, `encore`, `substitute`).
  - `p1StatStages` and `p2StatStages` (stat boost stages: `atk`, `def`, `spa`, `spd`, `spe`, `accuracy`, `evasion`).
  - `p1Status` and `p2Status` (non-volatile statuses: `slp`, `psn`, `tox`, `par`, `brn`, `frz`).
  - `p1Hp` and `p2Hp` (exact HP snapshots post-turn for instant 1:1 math parity checks).
  - `weather`, `terrain`, `p1SideConditions`, `p2SideConditions` (field and hazard conditions).
  - `p1ForceSwitch` and `p2ForceSwitch` (explicit forced switch flags).
  - `p1Heal`, `p2Heal`, `p1PreHeal`, `p2PreHeal` (explicit Infinite Punching Bag healing and revival flags).
- **Doubtful & Edge-Case State Logging**: Whenever any combat transition, state, or choice is doubtful, complex, or constrained (e.g. single-slot recharge moves, Outrage/Thrash locked moves, trapped states, forced switches, multi-turn charging moves), the fuzzer MUST record the exact decision and context with rich, self-documenting detail directly into the history on disk.
- **Strict Runtime Parity Verification**: Replayers and Playwright simulators MUST consume these explicit history fields to verify active UIDs, enabled move slots, and locked states. If runtime game state diverges from the certified history on disk, execution MUST fail loudly and immediately with an explicit `[E2E-DESYNC]` error detailing the mismatch. Guessing choices, picking default moves, or using silent fallbacks is strictly prohibited.

## 11. Anti-Hasty-Patch & Pre-Commit Audit

- **Absolute Prohibition on Rushed Simulation Patches & Fallbacks**: It is STRICTLY FORBIDDEN to apply hasty patches, ad-hoc fallback values, synthetic choice overrides (e.g. forcing `'move 1'`, swallowing missing data), or silent catch blocks (`.catch(() => true)`). Any deviation of state, move availability, or choice rejection MUST result in a clear, immediate test/runtime failure (`throw new Error(...)`) to expose parity bugs at the source.
- **Pre-Commit Audit**: Running `npm run audit:warnings-diff` is mandatory before any commit operation to guarantee 0 errors and 0 new warnings compared to `origin/main`.

## 12. Absolute Pokémon Legality & Inviolable PP Conservation Mandate

- **Absolute Pokémon Legality Mandate**: All Pokémon generated or evaluated in fuzzers, battle runners, replayers, and E2E simulations MUST be 100% legal according to Pokémon Showdown canonical Gen 9 rules and Poké Vicio's Pokédex database.
  - Generating synthetic or illegal Pokémon (e.g. assigning non-native abilities like *Illuminate* or *Rough Skin* to Mew, assigning non-learnable moves, or assigning invalid genders) is **STRICTLY FORBIDDEN**.
  - All generated species must strictly use natural Showdown Dex abilities, biological genders matching species ratio rules, and valid learnsets across all fuzzers and simulators.
  - When testing an ability, move, or mechanic, the generator MUST dynamically select a canonical species from the Showdown Dex that naturally possesses that ability or move.
  - All generated teams MUST pass `PokemonLegalityValidator.assertTeamLegality` before generation and simulation execution.
- **Inviolable PP Conservation and Replay Determinism Axiom**:
  - Because the Node fuzzer certifies battles to completion deterministically, a Pokémon in a fuzzer or E2E browser simulation can **NEVER** run out of PP or select an exhausted move unexpectedly unless desynchronized.
  - If a Pokémon in the fuzzer or browser simulation reaches a state with 0 PP or selects a move that is `disabled: true`, it is proof positive that a turn-count/cursor desynchronization occurred or that certified cheats/actions were misapplied.
  - It is **STRICTLY FORBIDDEN** to introduce runtime fallbacks that automatically pick another legal move or patch over the desynchronization. The engine MUST fail loudly and immediately (`throw new Error(...)`) with full context to diagnose and fix the root cause.

