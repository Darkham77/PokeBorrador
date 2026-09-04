# Testing & Simulation Rules

> **Scope & Authority**: This document governs **E2E Playwright simulation rules, passive joystick law, 5s timeout limits, mandatory #id locators, fuzzer history recording, shared runner execution, and isolated bug reproduction tests (RED-to-GREEN)** across Poké Vicio.
>
> 🛑 **Domain Boundaries & Redirection**:
> - For step-by-step browser QA procedures and DevTools console commands ➔ See [Browser Testing Manual](../qa/browser_testing_manual.md).
> - For battle engine execution details and Showdown parity ➔ See [Battle Mechanics Manual](../battle/battle_mechanics_manual.md).
> - For full verification checklists and release gates ➔ See [Audit Checklist](../qa/audit_checklist.md).

---

## 1. Mandatory Inheritance, Polymorphism & Zero Duplication

- It is STRICTLY FORBIDDEN to duplicate logic, structures, components, or control flows anywhere in the codebase (tests, frontend, or backend).
- If implementing functionality similar to an existing one, refactor first to extract a common abstract base class, parameterized composable, or generic extensible component. Stop before writing any new code and ask: *Can I use inheritance and polymorphism to reuse existing logic here?*

## 2. Mandatory 3-Tier Bug Fixing Protocol (Unit, Integrity & Playwright Simulation)

Whenever ANY bug, regression, or state desynchronization occurs across the project, you MUST resolve it through the mandatory 3-Tier Bug Fixing Protocol:

1. **Tier 1: Isolated Unit Test (RED-to-GREEN Reproduction)**:
   - You **MUST FIRST** create an isolated, self-contained unit test in `tests/node/` (pure Node logic) or `tests/unit/` (Vue/JSDOM components) that reproduces the failure deterministically in **RED** before writing or proposing any fix in `src/`.
   - The reproduction test MUST **extract and inline all failing data, seeds, and choice streams** (or use a dedicated static JSON fixture under `tests/fixtures/battle/`). Searching or referencing dynamic live fuzzer outputs is strictly forbidden because regenerated fuzzer runs invalidate temporary IDs.
   - **Dual Database Mandate**: If the bug touches persistence, SQL queries, schemas, database migrations, or DBRouter, the reproduction unit test MUST be written and executed across **ALL active database engines** (e.g. SQLite and PostgreSQL via `describeWithDatabase` from `tests/dbTestHelper.ts`) to reproduce the failure in RED and verify repair in GREEN on both engines.
   - Run `npx vitest run <path_to_test>` to confirm the deterministic RED failure.
2. **Tier 2: Integrity & Integration Test**:
   - You MUST create or update an integration test under `tests/integration/` or `tests/node/` that validates contract boundaries, schema integrity, FSM state machine lifecycle transitions, store roundtrips (`serializeState` -> `validateAndSanitize` -> `updateState`), and `@pkmn/sim` Showdown engine parity.
   - For database-related logic, integrity tests MUST assert identical schema structures, constraint enforcement, and query behavior across both SQLite and PostgreSQL.
   - This ensures the fix integrates cleanly across module boundaries without generating silent regressions.
3. **Tier 3: Playwright E2E Simulation (Following `@/game-simulation`)**:
   - For all bugs touching UI interactions, combat choreography, FSM orchestration, or user-facing features, verify and add Playwright E2E simulation cases governed strictly by the protocols in `@/game-simulation` (`.agents/skills/game-simulation/SKILL.md`):
     - **Passive Joystick Law**: Simulators must only react to explicit FSM readiness states (`WAIT_INPUT`, `SWITCH_MENU`, `over`) and typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`). Tests must NEVER mutate gameplay via debug methods, DOM dispatchers, or store actions.
     - **100% ID-Based Locators**: All element selections must use unique HTML IDs (`#<id>`) or data attributes (`data-pokemon-uid="${uid}"`, `data-item-id="${id}"`), never text matching or regex labels.
     - **Strict 5s Per-Action Timeout**: `MAX_PER_ACTION_TIMEOUT_MS = 5000`. A timeout indicates a source code bug in `src/`, NEVER a time shortage. Timeout inflation is strictly forbidden.
     - **Zero-Timer Synchronization**: Synchronization must be 100% event-driven. Polling loops (`waitForFunction`), `sleep`, `waitForTimeout`, and retry wrappers (`clickResilient`) are strictly forbidden.
     - **Certified Combat Replay**: Combats replay certified cases through the shared `ShowdownBattleRunner` with identical seeds, history, and native choices.
     - **Dual Database Persistence Verification**: Simulations verifying persistence, database migrations, or storage state MUST execute under dual-driver mode (`driver=dual` or dual clean zero pass) certifying 100% clean passes on both `[1/2 SQLite]` and `[2/2 PostgreSQL]`.

## 3. Logging Standards (`console.debug`)

- The use of `console.log` is strictly discouraged for diagnostics, E2E tracing, and automated test checkpoints.
- Developers and agents MUST use `console.debug` (or specific logger levels like `logger.debug`/`logger.warn` if available) for any technical logging that is only useful during development or test execution. This prevents polluting the production/runtime console.

## 4. Read-Only Diagnostics

- **Read-Only Diagnostics Only**: `window.__VITE_DEBUG__` may inspect state and collect diagnostics, but it MUST NOT advance, confirm, close, select, move, switch, flee, or otherwise mutate gameplay in a simulation. The only combat mutation exception is initialization of a current fuzzer-certified case.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill (`.agents/skills/project-browser-testing/SKILL.md`).

## 5. Playwright & E2E Simulation Standards

- **Mandatory ID-Based UI Selection**: Whenever locating UI components (buttons, modals, cards, inputs, windows) in Playwright tests or E2E simulations, you MUST strictly use unique HTML `id` attributes (`#start-encounter-btn`, `#confirm-battle-btn`, `#modal-close-btn`, etc.) or dedicated data attributes (`data-pokemon-uid="${uid}"`, `data-item-id="${id}"`). It is STRICTLY FORBIDDEN to locate elements by text content, regex labels, or button text (e.g. `has-text(...)`, `:has-text(...)`, text matching). All interactive UI components in Vue templates MUST have unique, descriptive `id` attributes.
- **Pre-Warmed Persistent Vite Server**: Master sequential simulation runners (`scripts/e2e/run_sequential_simulations.ts`) MUST initialize a single persistent Vite dev server instance with HTTP 200 health-check polling before launching suites, keeping it alive across all test files to eliminate cold-start reboots and non-deterministic booting timeouts.
- **Strict UID-Based Switch Selection in BaseBattleSimulation**: In `base_battle_simulation.ts`, voluntary and forced switch actions (`SWITCH_MENU` / `switch X`) strictly resolve target Pokémon via their canonical `uid` (`switchEntry.p1ActiveUid` or `playerSwitchSlots.find(s => s.showdownSlot === slot).pokemonUid`). The simulation driver locates bench cards exclusively by UID data attributes (`data-pokemon-uid="${targetUid}"`) rather than guessing index offsets or matching text.
- **Universal GSAP 100x Acceleration & Zero-Timer Parity**: All application animations, transition pauses, and delays use `gsapSleep` (from `@/logic/utils/gsapHelpers`) or GSAP timelines. This enables Playwright and headless battle simulations to scale execution time instantly (`gsap.globalTimeline.timeScale(100)`) without artificial timeouts, while preserving silky 1x playback for real users. GSAP acceleration is enforced at application startup in `src/main.ts` and intercepted via `page.addInitScript` in `e2e_helpers.ts`. Hardcoded `sleep(...)` or `setTimeout(...)` calls are strictly forbidden across `src/` to ensure simulations complete in seconds without hitting the 5s per-action or suite timeouts.
- **Dual Database State Isolation & Ephemeral Container Reset**: State persistence differences between in-memory SQLite and Docker PostgreSQL must be neutralized in `BaseSimulation.setup()`. Because SQLite drops and recreates the database file on every test run while the PostgreSQL container remains running in RAM across suites, `BaseSimulation.setup()` MUST systematically clean up user-scoped rows (`DELETE FROM market_listings ...`, `DELETE FROM claim_queue ...`, `DELETE FROM competition_entries ...`) before launching tests.
- **Official Keyboard Interaction**: When hover tooltips or pointer affordances keep a focused official control moving, the simulator MUST focus that ID-selected control and activate it with `Enter`. Keyboard activation is a genuine player interaction; it is preferred over force-clicks, coordinate clicks, or synthetic event dispatch.
- **Zero-Tolerance Turn Failure (Strict Fail-Fast Mandate)**: In any E2E or Playwright simulation, a single turn failure MUST immediately abort the simulation with a descriptive error. There are no retries, no silent skips, and no spin-loops.
- **Passive Joystick Rule & Complete Prohibition on Artificial Delays**: Simulations MUST act strictly as a passive joystick that ONLY reacts to explicit FSM readiness states and typed public application events (`battle-ready-for-input`, `battle-forced-switch-required`). It is STRICTLY FORBIDDEN to use arbitrary delays (`page.waitForTimeout`, `setTimeout`, `sleep`), store/FSM/DOM polling loops, or invent ad-hoc property heuristics (such as checking `hp === 0`). Before every visible action, the simulator MUST arm a typed public source event that represents the genuine completion boundary, then react to that event only with 100% zero-timer synchronization.
- **Prohibition on FSM State Manipulation & Pointer Overrides**: It is STRICTLY FORBIDDEN to hardcode FSM state transitions or manually manipulate FSM state variables to make E2E simulations pass. It is also STRICTLY FORBIDDEN to use force-click overrides (`{ force: true }`) or arbitrary delays to bypass pointer event blockages.
- **Strict Simulation Timeout Governance (5s Per-Action / Parameter-Configured Suite Budget)**:
  - **Per-Action Limit**: Every UI action and turn reaction once control is granted to the player/AI (`isReady = true`, `WAIT_INPUT`, `SWITCH_MENU`, `over`) is strictly capped at `MAX_PER_ACTION_TIMEOUT_MS = 5000` (5s Fail-Fast Rule). This timeout exclusively governs the input response window for player/AI decision making. It MUST NEVER prematurely abort or truncate the battle engine while actively processing multi-action turn animations, abilities, or logs (`isProcessing.value || isIntroAnimating.value`). Live combat logs must never be artificially capped to small numbers (e.g. 30).
  - **Suite Total Budget**: Test timeouts must be configured by parameter via `getSuiteTimeoutForBatch(turnCount)`. If replaying fuzzer history with `turnCount > 0`, budget scales proportionally to `turnCount * MAX_PER_ACTION_TIMEOUT_MS` (with a floor of `MAX_SUITE_TOTAL_TIMEOUT_MS`). When no turn history exists, standard suites strictly default to `MAX_SUITE_TOTAL_TIMEOUT_MS = 180000` (3 minutes).
  - Runtime multiplier guessing or inflating timeouts ad-hoc is strictly prohibited.
- **Intra-Suite Checkpoint Auto-Resumption (`failedBatchIndex`)**: When any simulation suite containing multiple batches or test cases fails or is interrupted, the runner records `failedBatchIndex` and `failedCaseId` in `scratch/e2e_checkpoints.json`. Subsequent runs MUST automatically resume from `failedBatchIndex`, skipping already passed batches to eliminate redundant execution. Child suite checkpoints MUST be merged and preserved upon process exit.
- **Strict Serial Database Driver Execution**: Database drivers (SQLite and PostgreSQL) MUST execute strictly in series (`[1/2 SQLite]` followed by `[2/2 PostgreSQL]`), never concurrently. Concurrency is strictly reserved for Playwright browser workers within the active suite.
- **Prohibition on Modifying Playwright Configuration**: It is STRICTLY FORBIDDEN to modify `playwright.config.ts` (especially the `workers` field) without an explicit user request.
- **Certified Combat Replay Contract**: Every Playwright simulation that enters combat MUST replay one current fuzzer-certified case. It consumes the same seed, atomic `history`, `playerChoices`, `enemyChoices`, recorded game actions, and IPB flags through the same `ShowdownBattleRunner` used by the headless replayer. The sole mutation exception initializes that certified starting scenario; it cannot open, close, confirm, move, select, switch, flee, target, or exit on the simulator's behalf. After initialization, the script translates each recorded action only into its matching visible official control, including bag opening, item selection, targeting, movement, menus, confirmations, and battle exit. Recorded IPB healing is permitted deterministic parity instrumentation, never a substitute for an official UI interaction. A manually constructed combat, manual encounter, or real-AI combat stream is invalid; add a legal objective-driven fuzzer case first. This contract is limited to combat and does not replace non-combat domain simulation rules.
- **Forced Recharge State Simulation Replay**: When replaying certified battles containing moves with forced recharge turns (e.g. *Hyper Beam*, *Giga Impact*, *Rock Wrecker* causing `|-mustrecharge|`), the active Pokémon is marked `trapped: true` by Showdown and voluntary switching is illegal. Battle replayers and test runners must inspect `isTrappedOrRecharging` (`isRecharging` / `active[0].moves[0].id === 'recharge'`) before attempting voluntary switches; if trapped/recharging, the replayer MUST execute `selectMove(0)` (the forced recharge action) to ensure deterministic battle progression.

## 6. Mandatory Shared Code & Parity

- **100% Shared Battle Runners**: All battle-related Playwright simulations MUST use the shared `ShowdownBattleRunner` (via `src/logic/battle/runner/showdownBattleRunner.ts`). Creating ad-hoc battle runners or custom turn dispatchers in individual simulation scripts is STRICTLY FORBIDDEN.
- **Simulation Data Parity Mandate**: It is strictly forbidden to bypass, truncate, or alter state/health synchronization pipelines between live gameplay and simulation environments using conditional guards like `!isSimulation` or `!isDeterministicSimulation` in client/worker communication layers (e.g. `showdownWorkerClient.ts`). All E2E simulations, fuzzers, and live players must execute 100% identical data extraction and synchronization pipelines to prevent latent production bugs from being masked during CI testing.
- **Zero-Untested Goal Principle**: Coverage goals cannot be declared completed if even one move, ability, or item is reported as `UNTESTED` in fuzzer outputs.

## 7. Infinite Punching Bag (IPB) Lifecycle Law

- **Objective-Scoped IPB Lifecycle Law**: In fuzzer battle execution, Infinite Punching Bag (IPB) healing cheats MUST operate strictly while there are untested moves/abilities remaining in the batch (`hasUntestedItemsAfterTurn === true`). As soon as all moves/abilities in the batch are certified, IPB cheats MUST be immediately deactivated (`ipbActive = false`) for the remainder of the battle, allowing combat to complete naturally until `simBattle.ended === true`. Artificial turn limits, synthetic truncations, or keeping IPB cheats active post-testing are strictly prohibited.
- **Prohibition on Permanent Cheat Loops**: It is STRICTLY FORBIDDEN to keep IPB cheats active indefinitely until max turn limits. Keeping IPB cheats active indefinitely prevents PP depletion, blocks natural `Struggle` recoil execution, and creates artificial 1000-turn stall loops.

## 8. Mandatory Disk Fuzzer Case Synchronization Before Code Diagnosis

- Whenever a Playwright E2E simulation or replayer throws a desync, unexpected turn overflow, or step mismatch, the agent MUST FIRST verify if `scripts/e2e/results/fuzzer_certified_cases.json` is 100% up to date with the latest fuzzer logic by executing `npm run sim:fuzzer` BEFORE forming any diagnostic hypothesis or making edits to `src/` or simulation wrappers.
- Attempting to debug or patch runtime synchronization logic against stale or un-regenerated certified case artifacts on disk is STRICTLY FORBIDDEN.

## 9. Canonical 7-Step Bug Lifecycle & Verification Protocol (from `@/game-simulation`)

Whenever ANY bug, test failure, or simulation desync occurs, the agent MUST follow the exact 7-step lifecycle defined in `@/game-simulation` (`.agents/skills/game-simulation/SKILL.md`):

1. **Step 1: Fuzzer Execution & Regeneration** (`npm run sim:fuzzer`):
   - Run fuzzer whenever certified cases do not exist or when battle engine logic (`src/logic/battle/`) is refactored. Validate certified cases with `npm run sim:fuzzer:validate`.
2. **Step 2: E2E Simulation Execution** (`npm run sim:e2e` or targeted family):
   - Execute the test suite to validate real UI, FSM, and game feature behaviors.
3. **Step 3: Isolate Failing Family and Specific Case ID**:
   - Immediately STOP running the entire suite upon the first failure. Focus exclusively on the specific failing family/case.
4. **Step 4: Create Isolated RED Reproduction Test (Tier 1 & Tier 2)**:
   - Extract the exact static case parameters (`seed`, teams, turn-by-turn choice streams from `history`) into a static fixture file (`tests/fixtures/battle/case_xxx.json`) or directly inside a dedicated Vitest test file (`tests/node/battle/reproduce_case_xxx.test.ts`).
   - Run `npx vitest run <path_to_test>` and verify that the test reproduces the failure in **RED**.
5. **Step 5: Fix Root Cause in `src/` & Verify GREEN**:
   - Diagnose the true root cause in `src/` and apply the clean fix without fallbacks (`||`, `??`, dummy derivations).
   - Re-run the reproduction test in Vitest to empirically verify it turns **GREEN**.
6. **Step 5.5: Full Node Unit Regression Check (`npm run test:node` / `npm run test`)**:
   - Execute the entire Node test suite to confirm 100% GREEN and 0 regressions before touching browser simulations.
7. **Step 6: Re-run ONLY the Specific Failing Simulation in Playwright (Tier 3)**:
   - Re-run ONLY the affected simulation suite (e.g. `npm run sim:e2e:combat` or targeted family) following `/game-simulation` protocols.
8. **Step 7: Full Master Regression Pass**:
   - Run `npm run sim:e2e` only after all family cases pass 100% clean.

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
- **Pre-Commit Audit**: Running `npm run audit` is mandatory to guarantee 0 errors across the codebase before committing. (The diff comparator `npm run audit:for-commit` is strictly reserved for the safe-commit pipeline).

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

## 13. Event Stream Parity Testing Mandate

- **Chronological Event Stream Verification**: Automated tests for combat animations and FSM lifecycles MUST record and assert an Event Stream to guarantee that withdraw animations, defeat logs, sendout announcements, release animations, and combatant UID mounting execute in strict chronological sequence across single and multi-Pokémon (6v6) encounters, eliminating silent animation drops.

## 14. Map Atmosphere & Gym Climate Lifecycle Testing Mandate

- **Environmental, Configurable & Sprite-Aware Atmosphere Testing**: Automated test suites for battle visual atmosphere (`gym_weather_isolation.spec.ts`, `gym_atmosphere_lifecycle_integration.spec.ts`) MUST verify:
  1. **Default Single-Sprite / Gym Isolation**: Standard gyms maintain constant day lighting (`effectiveCycle = 'day'`) and block outdoor weather transitions.
  2. **Configurable Gym/Map Overrides**: Gyms and battles with explicit `fixedCycle: 'night'` or custom `fixedWeather` render their configured atmosphere accurately regardless of real-time ticks.
  3. **Multi-Sprite Responsiveness**: Locations with multi-cycle sprites (open routes and multi-sprite interiors like `mansion`) react dynamically to time changes.
  4. **In-Combat Weather Lifecycle**: Moves and abilities properly cast weather in any arena and cleanly revert upon expiration.

## 15. GSAP Animation & Visual Kinematics Testing Standards

- **Synchronous GSAP Mocking in Unit Tests**: Unit tests in `tests/unit/battle/` verifying GSAP action helpers (`combatantActionAnims.ts`, `useBattleCaptureAnimations.ts`) must supply synchronous timeline execution stubs where `awaitAnimation` progresses the timeline to 1 (`anim.progress(1)`) and `tl.add` executes passed action callbacks immediately. This prevents 60s JSDOM ticker stalls while maintaining deterministic assertion on timeline parameters (`duration`, `scale`, `filter`, `x`, `y`, `ease`).
- **3-Tier Combat Animation Testing Matrix**:
  - **Tier 1 (Unit)**: Direct verification of GSAP parameters, timeline children, and state flags in isolation.
  - **Tier 2 (Integrity)**: Verification of FSM transitions (`CATCH_PROCESS`, `CATCH_SHAKE`, `CATCH_BREAK`, `FADEOUT_BALL`, `ESCAPE_PROCESS`) and eventBus audio/visual signals.
  - **Tier 3 (Playwright E2E Simulations)**: Verification in browser context ensuring 0 visual lockups, smooth return to map, and proper HUD settlement under official UI controls.
- **Playwright Battle Simulation Code Hygiene**:
  - Always declare descriptive named constants for battle simulation parameters (`MEWTWO_BOSS_LEVEL`, `HIGH_LEVEL_PIDGEOT`, `SPEED_PENALTY_STAGE`) to eliminate inline magic numbers.
  - Use `BaseBattleSimulation.getBattleStoreState()` to inspect combatant snapshot states rather than raw inline evaluations.

## 16. Multi-User Simulation Database Key Prefix & Category Synchronization

- **Database Key Prefix (`sim_`)**: Multi-user sequential simulation suites running against the in-memory Vite dev DB bridge (`/api/dev-export-db`) MUST declare `window.__GTS_SIMULATION__ = true` and utilize SQLite keys beginning with `sim_` (`sim_<name>_<timestamp>`).
- **Normalized DB Path Resolution**: `BaseE2ESimulation.getDbPath()` MUST normalize keys to avoid duplicate prefixes (`sim_sim_...`).
- **Category ID Alignment**: Sub-competition category identifiers submitted in simulation helpers (`submitCompetitionEntry`) MUST strictly match the IDs declared in `events_config` and rendered by `EventCard.vue` (`'ivs'`, `'weight'`, `'height'`).



