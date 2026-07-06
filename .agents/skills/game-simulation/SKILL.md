---
name: game-simulation
description: >
  Orchestrates E2E game simulations to detect and fix bugs in src/. Use when
  the user asks to "run simulations", "run e2e", "check the game against tests",
  "detect bugs via simulation", "verify game behavior", or whenever src/ changes
  need validation against the E2E suite. This skill governs the full cycle:
  execute -> detect failure -> fix src/ -> re-run until clean -> final regression
  pass. ALWAYS use this skill instead of running test commands ad-hoc.
---

# game-simulation

Orchestrates the game simulation and E2E pipeline with a single goal: **make the
game match what `@pkmn/sim` (Pokemon Showdown) says is correct.** Simulations are
the source of truth. `src/` must conform to them, never the reverse.

---

## Mandatory Progress Artifact

**Every simulation run MUST maintain a live artifact at
`scripts/battle-tester/results/sim_progress_YYYYMMDD.md` (create it before the first command runs,
update it after each meaningful step). This artifact is the single source of truth
for the current run and allows resuming at any point without losing context.

### Artifact structure

```markdown
# Simulation Run — <ISO date>
Session: <unique short id, e.g. last 6 chars of timestamp>

## Scope
<!-- what the user asked to simulate -->

## Status
Overall: IN_PROGRESS | COMPLETE | BLOCKED
Last action: <what was just done>
Resumed at: <step name> (only when resuming)

## Simulation Queue
<!-- checked = done, unchecked = pending, ⚠ = failed/needs fix -->
- [x] test:node (unit) — PASS
- [x] test (integration) — PASS
- [ ] test:e2e:combat — IN PROGRESS
- [ ] test:e2e:gyms
- [ ] test:e2e:breeding
...

## Active Fix — <simulation name>
Root cause: ...
Files touched: ...
Attempts: N
Status: FIXING | PENDING_RERUN | PASS

## Completed Fixes
| Simulation | Root Cause | Fix Applied | Attempts | Result |
|---|---|---|---|---|

## Pending Simulations (not yet started)
<!-- simulations still in queue after the last failure -->

## Structural Blockers (user review required)
| Simulation | Why a design decision is needed |
|---|---|

## Critical Decisions
<!-- key design or architecture decisions made during this run -->

## Coverage Gaps Detected
| Gap | Suggested simulation type |
|---|---|
```

### Rules for the Progress Artifact

1. **Create before the first simulation command.** The artifact must exist before
   any `test:*`, `test:e2e:*`, `test:combat:*`, or `npx playwright` command is
   issued. Other `npm run` commands (lint, build, validate:types, etc.) do not
   count as simulation commands and do not require the artifact to exist first.
2. **Update after every step.** After each simulation pass/fail, after each fix
   applied, after each file touched — update the artifact.
3. **Mark resumption point.** On any interruption (user message, context limit,
   error), ensure the artifact reflects exactly where execution stopped and what
   is next, so a fresh agent can pick up without duplicating work.
4. **One artifact per session.** If the user resumes a previous run, look for the
    existing `scripts/battle-tester/results/sim_progress_<YYYYMMDD>.md` artifact first and continue from it.
   Only create a new one if none exists or the user explicitly starts fresh.
5. **Final state.** When the run is complete, mark `Status: COMPLETE` and merge
   the artifact summary into the final `scripts/battle-tester/results/simulation_report_<timestamp>.md`.

---

## Test System Architecture

The project has **three testing layers**, each with a distinct role:

```
scripts/battle-tester/                <- Layer 0: FUZZER (pure logic, @pkmn/sim)
    run-tester.ts                     <- Main engine
    team-generator.ts                 <- Builds test batches
    item-generator.ts                 <- Builds item test batches
    battle-agent.ts                   <- Decides moves for p1/p2
    ability-scenarios.ts              <- Scripted scenarios for specific abilities
    results/
        certified_fuzzer_cases.json   <- OUTPUT consumed by E2E specs
        coverage_report.json          <- OUTPUT coverage report

tests/node/                           <- Layer 1: UNIT (pure Node.js, no browser)
    battle/         battleMath, showdownAdapter, pp logic, weather abilities...
    inventory/      item math, npc budgets...
    pokemon/        stats, generation, migrations...
    system/         economy, GTS, DB translation, backup validation...
    world/          spawn integrity, weather, maps...

tests/integration/battle/             <- Layer 2: INTEGRATION (Vitest + @pkmn/sim)
    coverage_fuzzer.spec.ts           <- Vitest entry point (re-exports run-tester)
    item_coverage_fuzzer.spec.ts
    showdown_integration.spec.ts
    showdown_item_sync.spec.ts
    showdown_bridge_bugs.spec.ts

tests/e2e/                            <- Layer 3: E2E (Playwright, real browser)
    e2e_helpers.ts                    <- Shared: login, battle input, FSM polling
    pretest_fuzzer_check.ts           <- Guard: ensures certified_fuzzer_cases.json exists
    battle/
        fsm_sync.spec.ts              <- Full multi-turn battle (consumes fuzzer output)
        held_items.spec.ts            <- Item effects in combat (consumes fuzzer output)
        weather.spec.ts               <- Weather / ability interactions
    gyms/
        gym_progression.spec.ts       <- Gym challenge -> badge
    gts/
        transactions.spec.ts          <- Publish/buy trade cycle (dual-page)
    breeding/
        breeding.spec.ts              <- Deposit -> hatch cycle
    missions/
        daycare_missions.spec.ts      <- Mission completion flow
    save/
        save_shield.spec.ts           <- Zero-Pokemon save guard
```

### Fuzzer -> E2E Dependency Chain

```
run-tester.ts
  |  simulates battles deterministically using @pkmn/sim
  |  applies Infinite Punching Bag pattern (HP < 30% -> restore to 100%)
  |  records each restoration in batchCheats[]
  |
  +---> certified_fuzzer_cases.json
            |-- section "battle" -> consumed by fsm_sync.spec.ts
            +-- section "items"  -> consumed by held_items.spec.ts
                 (E2E replays identical cheats to mirror the fuzzer state)
```

**Key rule:** The fuzzer runs `@pkmn/sim` as the authoritative engine. If the
game's `src/` behavior diverges from Showdown's output, `src/` is wrong. The
simulation is right.

### Infinite Punching Bag Pattern

The fuzzer prevents premature battle endings by restoring HP when it drops below
30% of max. This keeps Pokemon alive long enough to cover all moves and abilities.
Restorations are saved in `batchCheats` and replayed identically in the E2E specs,
so both the fuzzer and the real browser reach the same game state.

---

## npm Scripts Reference

| Script | What it runs |
|---|---|
| `test:node` | All `tests/node/**/*.test.ts` via native `node:test` |
| `test` | All unit + integration via Vitest |
| `test:combat:fuzzer` | Coverage fuzzer + item fuzzer (generates certified_fuzzer_cases.json) |
| `test:e2e` | All Playwright E2E specs |
| `test:e2e:battle` | Only `tests/e2e/battle/` |
| `test:e2e:combat` | pretest_fuzzer_check + `fsm_sync.spec.ts` |
| `test:e2e:combat:report` | Same, output redirected to `scratch/e2e_fsm_report.txt` |
| `test:e2e:gyms` | Only `tests/e2e/gyms/` |
| `test:e2e:gts` | Only `tests/e2e/gts/` |
| `test:e2e:breeding` | Only `tests/e2e/breeding/` |
| `test:e2e:missions` | Only `tests/e2e/missions/` |
| `test:e2e:save` | Only `tests/e2e/save/` |
| `test:combat:all` | Fuzzers + unit/battle + all Playwright E2E |
| `test:combat:all:report` | All of the above -> `scratch/combat_report.txt` + `scratch/playwright_report.txt` |

### Filtering Individual Test Cases

Every simulation script must support a `TEST_CASE` (or equivalent) filter to
enable targeted re-runs. The E2E battle specs already support these env vars:

```bash
TEST_CASE=<case-id>             # Run only this specific case in fsm_sync
TEST_START_FROM_CASE_ID=<id>    # Start from this case onwards
TEST_BATCH=<n>                  # Run only batch N
REGENERATE_CASES=true           # Force fuzzer to overwrite certified_fuzzer_cases.json
```

### E2E Multi-Error Logging Mode (Mass-Debugging)

To analyze multiple E2E battle bugs simultaneously and identify patterns without early termination, run the E2E suite with the `CONTINUE_ON_ERROR=true` environment variable.

When `CONTINUE_ON_ERROR=true` is set:
1. Playwright tests intercept FSM/HP/parity errors, save them to the `scratch/e2e_failures/` directory, and exit the test block successfully.
2. This avoids triggering Playwright's `maxFailures: 1` setting, allowing all cases in the suite to execute.
3. At the end, the suite consolidates all failure data into `scripts/battle-tester/results/failed_e2e_cases.json` and a readable summary in `scratch/failed_e2e_cases.txt`.

**Execution Command:**
```bash
$env:CONTINUE_ON_ERROR="true"; npm run test:e2e:combat
```

**Design rule:** If a simulation is missing `TEST_CASE` support, treat that as
a design gap. Propose adding it and document the plan before implementing.

## Playwright Dependency & Environment Troubleshooting

If Playwright fails to run due to missing browsers, missing system libraries, or tools like `ffmpeg` (e.g., yielding errors like `Error: playwright needs to install...` or missing ffmpeg for video recordings), the agent MUST attempt to resolve it automatically by running:

```bash
npx playwright install --with-deps
```

This command installs the required browsers along with all system dependencies (including `ffmpeg`). If the installation fails due to permissions, the agent should ask the user to run it with appropriate privileges or use the `ask_permission` tool if applicable.

---

## Simulation Execution Workflow

> [!IMPORTANT]
> **Strict Sequential Execution Mandate:** NEVER run multiple simulation commands or test suites concurrently or in parallel. Each simulation command already utilizes multicore resources internally. Running two or more simulation commands at the same time will saturate the CPU and generate execution errors. Always wait for one simulation run to completely finish before starting another.

### Step 1 — Determine scope

| User intent | Command |
|---|---|
| Full game validation | `npm run test:e2e` |
| Combat only | `npm run test:e2e:combat` |
| Specific domain | `test:e2e:gyms`, `test:e2e:breeding`, etc. |
| Single failing test | env var filter or `npx playwright test --grep "<name>"` |

**Fuzzer rule:** Only run `test:combat:fuzzer` if:
1. `scripts/battle-tester/results/certified_fuzzer_cases.json` does not exist, OR
2. The user explicitly requests `REGENERATE_CASES=true`

Otherwise reuse the existing JSON. `pretest_fuzzer_check.ts` handles this
automatically when using `test:e2e:combat`.

### Step 2 — Execute and capture output

Always redirect output to `scratch/` so results are preserved for analysis:

```bash
npm run test:e2e:combat:report     # -> scratch/e2e_fsm_report.txt
npm run test:combat:all:report     # -> scratch/combat_report.txt + scratch/playwright_report.txt

# Or manually for a specific spec:
npx playwright test tests/e2e/battle/fsm_sync.spec.ts 2>&1 | tee scratch/sim_run_$(date +%s).txt
```

### Step 3 — On failure: the fix loop

```
DETECT failure in simulation X
  |
ANALYZE: read the test carefully. Understand what game behavior it asserts.
  |
STUDY SHOWDOWN: Consult first the local Showdown source code in pokemon-showdown-code/
                to understand the exact logic and flow Showdown uses for this scenario.
                CRITICAL: NEVER copy code from Showdown! Use it only to understand
                how to call the library and manage our state representations.
  |
DIAGNOSE: locate the divergence in src/ (never in the test).
  |
REPRODUCE WITH UNIT TEST: Extract the failing case/context from the failed simulation
                          and write a minimal, reproducing unit test under tests/unit/
                          or tests/node/. Verify that the test fails as expected.
  |
CLASSIFY complexity:
  - Simple bug (wrong value, missing case, off-by-one) -> proceed to fix
  - Structural (requires design change) -> STOP, explain to user, propose plan
  |
FIX src/ to match what @pkmn/sim declares as correct.
  |
VALIDATE VIA UNIT TESTS: Run the new unit test (and all related unit/node tests)
                         to verify the fix works at the logic level before running
                         heavy browser simulations.
  |
RE-RUN only simulation X (use TEST_CASE filter or domain script).
  |
  +-- PASS -> continue with remaining simulations from where execution stopped
  +-- FAIL -> repeat fix loop (no retry limit for simple bugs)
```

**MANDATORY: Unit-Test First & Pre-Simulation Validation Rules**
1. **Never skip reproducing tests:** Whenever a simulation fails or a bug is reported, you MUST first create or update a unit test (or lightweight Node test) that successfully reproduces the failure BEFORE applying any fix to `src/`.
2. **Never run E2E simulations on untested code changes:** Any code edits in `src/` must first be validated by executing and passing the unit/integration tests (`npm run test` or specific file path test) BEFORE proposing or running any browser-based E2E Playwright simulations. This saves time and computational resources.

After all individual fixes pass, **run the full E2E suite once more** to catch
regressions before reporting completion.

### Step 4 — Final report

Generate `scratch/simulation_report_<timestamp>.md`:

```markdown
# Simulation Run — <date>

## Summary
- Total: N tests | P passed | F failed | S skipped

## Failures Fixed
| Simulation | Root Cause | Fix Applied in src/ | Attempts |
|---|---|---|---|

## Failures Requiring User Review (structural)
| Simulation | Why a design decision is needed |

## Regressions Detected
| None / list |

## Fuzzer Coverage
- Moves tested: X/Y
- Items tested: X/Y
- Abilities tested: X/Y

## Coverage Gaps Detected
| Gap | Suggested simulation type |
```

Then summarize in chat with clear action options for the user.

---

## Rules for Modifying Tests vs. src/

### Allowed: modify E2E specs or fuzzers to...
- Add `console.log` or more descriptive error messages for debugging
- Add new fuzzer scenarios (new abilities, items, edge cases)
- Fix flaky timing (increase timeouts, improve FSM polling)
- Add missing `TEST_CASE` / domain filter support
- Extend coverage without weakening any existing assertion

### FORBIDDEN: modify E2E specs or fuzzers to...
- Weaken or remove an assertion to make `src/` pass
- Skip or comment out a failing scenario
- Change an expected value to match incorrect `src/` behavior
- Add a `try/catch` that silences a desync or failure
- Bypass a state-parity check
- Use silent mock/patch workarounds in E2E tests, helper scripts, or test workers that automatically bypass, ignore, or rewrite choices when state, active combatants, or move selections desynchronize. The objective is never to finish simulations with fake patches/mocks, but to find and fix bugs in `src/` that prevent matching the fuzzer.
- Hardcode FSM state transitions or manually manipulate FSM state variables (such as forcing transitions to `WAIT_INPUT` or bypassing `SWITCH_MENU`/`PLAYER_FAINT_SEQ` when a Pokémon is healed/restored) to force E2E simulations or test replays to pass. The FSM must transition naturally and mirror the simulator's requests exactly.

**The simulation is law. src/ must conform.**

---

## Adding New Fuzzer Scenarios vs. New Playwright Specs

### Combat coverage gaps -> fuzzer first
Add scenarios to `scripts/battle-tester/` (ability-scenarios, team-generator,
item-generator). The fuzzer validates them against `@pkmn/sim`. The E2E Playwright
specs consume the certified output automatically. This is the preferred path because
Showdown acts as the oracle.

### Non-combat coverage gaps -> propose, then implement
For new Playwright specs (breeding, GTS, missions, save, gyms):
1. Document the gap in the simulation report.
2. Propose a work plan to the user with the spec design.
3. Only implement after user approval.

---

## Detecting Future Simulation Gaps

Look for these signals:
1. New `src/` features with no corresponding E2E spec (check `tests/e2e/` domain folders).
2. Untested abilities or items in `coverage_report.json` or `scratch/fuzzer_report.txt`.
3. `// TODO` / `// test this` comments in `src/`.
4. Features covered only by unit tests but never exercised in a real browser session.
5. New npm scripts in `package.json` not linked to any simulation workflow.

Document all gaps in the simulation report under "Coverage Gaps Detected".

---

## Browser Debug Utilities

The E2E specs use `window.__VITE_DEBUG__` and `window.__VITE_DEBUG_STORE_RESOLVER__`
for state injection and FSM polling. Always prefer these CLI-based simulation
helpers over manual UI interaction. See `@/project-browser-testing` and
`@/project-standards/references/browser_testing_manual.md` for the full protocol.
