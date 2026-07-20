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

**Every simulation run MUST maintain a live internal artifact named `simulation_progress.md` (located in the brain directory) as the single source of truth for the current run, allowing resumption at any point without losing context. Simultaneously, a copy of this artifact MUST be mirrored in the repository at `scripts/e2e/results/simulation_progress_log_YYYYMMDD.md` (create both before the first command runs, and update/mirror after each meaningful step).**

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
- [ ] sim:e2e:combat — IN PROGRESS
- [ ] sim:e2e:gyms
- [ ] sim:e2e:breeding
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

1. **Create before the first simulation command.** The internal `simulation_progress.md` artifact and its mirrored copy at `scripts/e2e/results/simulation_progress_log_YYYYMMDD.md` must exist before any `sim:*` or `sim:e2e:*` command is issued. Other `npm run` commands (lint, build, validate:types, etc.) do not count as simulation commands and do not require the artifact to exist first.
2. **Update and mirror after every step.** After each simulation pass/fail, after each fix applied, after each file touched — update the internal `simulation_progress.md` artifact (setting `UserFacing: true` and appropriate metadata) and immediately overwrite/mirror it to `scripts/e2e/results/simulation_progress_log_YYYYMMDD.md`.
3. **Mark resumption point.** On any interruption (user message, context limit, error), ensure the progress artifact reflects exactly where execution stopped and what is next, so a fresh agent can pick up without duplicating work.
4. **Resuming a run (Physical File Synchronization First).** Whenever starting, resuming, or continuing a simulation workflow, the agent MUST first look for the latest mirrored physical file `scripts/e2e/results/simulation_progress_log_<YYYYMMDD>.md` in the repository (sorting by date to find the most recent one). Even if an internal `simulation_progress.md` exists in the brain, the agent MUST prioritize the physical mirrored file's content to restore the execution state, simulation queue, and pending tasks. This prevents desynchronization when changing branches, repositories, or active agents. The agent MUST recreate/synchronize the brain's internal `simulation_progress.md` artifact from this physical repository file before executing any simulation command, ensuring both representations are in perfect parity.
5. **Final state.** When the run is complete, mark `Status: COMPLETE` and merge the artifact summary into the final `scripts/e2e/results/simulation_report_<timestamp>.md`.
6. **Strict Truthfulness in Test Results (No Premature PASS).** It is strictly forbidden to mark a test suite (e.g. `sim:e2e:combat`) as `PASS` in the simulation queue or progress log if any of its cases were skipped, filtered out, untested, or if the entire suite was not run to completion. A suite is only `PASS` when all of its cases/batches are executed and pass successfully with zero failures. If only specific cases were verified, keep the status as `IN_PROGRESS` or `PARTIAL_PASS` and document exactly which cases remain.

---

## Test System Architecture

The project has **three testing layers**, each with a distinct role:

```
scripts/e2e/fuzzer/                   <- Layer 0: FUZZER (pure logic, @pkmn/sim)
    core/
        fuzzer_engine.ts              <- Main engine
        fuzzer_agent.ts               <- Decides moves for p1/p2
        fuzzer_mock_battle_store.ts   <- Headless Pinia battle store mock
        fuzzer_runner.ts              <- Native fuzzer runner (decoupled from Vitest)
    generators/
        fuzzer_team_generator.ts      <- Builds test batches
        fuzzer_item_generator.ts      <- Builds item test batches
    scenarios/
        fuzzer_ability_scenarios.ts   <- Scripted scenarios for specific abilities
        fuzzer_excluded_abilities.ts  <- List of excluded abilities
    runners/
        run_moves_fuzzer.ts           <- Native runner for moves
        run_abilities_fuzzer.ts       <- Native runner for abilities
        run_items_fuzzer.ts           <- Native runner for items
        fuzzer_case_replayer.ts       <- Replay specific cases step-by-step
        ensure_fuzzer_cases.ts        <- Ensures certified cases exist

tests/node/                           <- Layer 1: UNIT (pure Node.js, no browser)
    battle/         battleMath, showdownAdapter, pp logic, weather abilities...
    inventory/      item math, npc budgets...
    pokemon/        stats, generation, migrations...
    system/         economy, GTS, DB translation, backup validation...
    world/          spawn integrity, weather, maps...

tests/integration/battle/             <- Layer 2: INTEGRATION (Vitest + @pkmn/sim)
    showdown_integration.spec.ts
    showdown_item_sync.spec.ts
    showdown_bridge_bugs.spec.ts

scripts/e2e/                          <- Layer 3: Simulations (Playwright, real browser)
    e2e_helpers.ts                    <- Shared: login, battle input, FSM polling
    fuzzer/runners/ensure_fuzzer_cases.ts <- Guard: ensures fuzzer_certified_cases.json exists
    battle/
        battle_fsm_sync.sim.ts        <- Full multi-turn battle (consumes fuzzer output)
        battle_held_items.sim.ts      <- Item effects in combat (consumes fuzzer output)
        battle_weather_effects.sim.ts <- Weather / ability interactions
    gyms/
        gym_progression.sim.ts        <- Gym challenge -> badge
    gts/
        gts_transactions.sim.ts       <- Publish/buy trade cycle (dual-page)
    breeding/
        breeding_lifecycle.sim.ts     <- Deposit -> hatch cycle
    missions/
        daycare_missions.sim.ts       <- Mission completion flow
    save/
        save_shield_restrictions.sim.ts <- Zero-Pokemon save guard
```

### Fuzzer -> E2E Dependency Chain

```
run_moves_fuzzer.ts / run_abilities_fuzzer.ts / run_items_fuzzer.ts
  |  simulates battles deterministically using @pkmn/sim
  |  applies Infinite Punching Bag pattern (HP < 30% -> restore to 100%)
  |  records each restoration in batchCheats[]
  |
  +---> fuzzer_certified_cases.json
            |-- section "battle" -> consumed by battle_fsm_sync.sim.ts
            +-- section "items"  -> consumed by battle_held_items.sim.ts
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
| `sim:fuzzer` | Coverage fuzzer + item fuzzer (generates fuzzer_certified_cases.json) |
| `sim:e2e` | All Playwright scenario simulations |
| `sim:e2e:battle` | Only `scripts/e2e/battle/` |
| `sim:e2e:combat` | ensure_fuzzer_cases + `battle_fsm_sync.sim.ts` |
| `sim:e2e:combat:report` | Same, output redirected to `scripts/e2e/results/e2e_simulation_failures.json` |
| `sim:e2e:gyms` | Only `scripts/e2e/gyms/` |
| `sim:e2e:gts` | Only `scripts/e2e/gts/` |
| `sim:e2e:breeding` | Only `scripts/e2e/breeding/` |
| `sim:e2e:missions` | Only `scripts/e2e/missions/` |
| `sim:e2e:save` | Only `scripts/e2e/save/` |
| `sim:combat:all` | Fuzzers + all Playwright scenario simulations |
| `sim:combat:all:report` | All of the above -> `scripts/e2e/results/playwright_report.txt` |

### Filtering Individual Test Cases

Every simulation script must support a `TEST_CASE` (or equivalent) filter to
enable targeted re-runs. The E2E battle specs and fuzzer replayer support these env vars:

```bash
# Para simulación E2E de Playwright (Navegador):
TEST_CASE=<case-id>                 # Correr solo este caso (o lista separada por comas) en battle_fsm_sync
TEST_CASE_ID=<case-id>              # Correr solo este caso (o lista separada por comas)
TEST_START_FROM_CASE_ID=<id>        # Empezar desde este caso en adelante
TEST_BATCH=<n>                      # Correr solo el lote N (ej: 1, 9, 17, 25)

# Para depuración Headless (Súper Rápida, 1-2 segundos, sin navegador):
TEST_CASE_ID=<case-id>              # Correr el replayer headless de un caso (o lista separada por comas)
```

> [!CAUTION]
> **PROHIBITION OF -g / --grep IN PLAYWRIGHT:**
> It is strictly forbidden to use Playwright's `-g` or `--grep` flag to filter individual test cases (e.g., `npx playwright test -g "lote de fuzzer #10"`). Using `-g` can spawn misconfigured parallel test threads without properly initializing the batch's state variables. Always use the project's official environment variables (`TEST_BATCH`, `TEST_CASE_ID`, etc.) for isolated and controlled executions.

> [!IMPORTANT]
> **REGLA DE ORO DE RENDIMIENTO EN PRUEBAS:**
> 1. **SIEMPRE PREFERIR EL REPLAY HEADLESS:** Si vas a verificar, depurar o testear la paridad de lógica, HP, FSM o estados de combate, **NUNCA** levantes el navegador con Playwright (`npm run sim:e2e:combat`). Usa siempre el replayer headless oficial:
>    ```bash
>    $env:TEST_CASE_ID="case-47212c07bc5d"; npm run sim:fuzzer:trace
>    ```
>    Este script corre en Node.js puro y termina en 1-2 segundos, mientras que Playwright tarda más de 30-40 segundos por caso al instanciar el navegador y el servidor Vite.
> 2. **FILTRADO MULTICASO:** Para ejecutar un conjunto específico de casos (ej: 10 casos que fallaron), pásalos separados por coma:
>    ```bash
>    $env:TEST_CASE_ID="case-47212c07bc5d,case-006487488a68,case-153adc178311"; npm run sim:fuzzer:trace
>    ```
> 3. **PLAYWRIGHT SOLO PARA REGRESIONES FINALES:** Reserva la simulación de navegador Playwright únicamente para validar regresiones finales (una vez que los casos pasen en headless) o para probar comportamientos visuales/reactivos de la UI (ej: modales, animaciones GSAP, arrastrar elementos).

### E2E Multi-Error Logging Mode (Mass-Debugging)

To analyze multiple E2E battle bugs simultaneously and identify patterns without early termination, run the E2E suite with the `CONTINUE_ON_ERROR=true` environment variable.

When `CONTINUE_ON_ERROR=true` is set:
1. Playwright tests intercept FSM/HP/parity errors, save them to the `scripts/e2e/results/e2e_failures/` directory, and exit the test block successfully.
2. This avoids triggering Playwright's `maxFailures: 1` setting, allowing all cases in the suite to execute.
3. At the end, the suite consolidates all failure data into `scripts/e2e/results/e2e_simulation_failures.json` and a readable summary in `scripts/e2e/results/failed_e2e_cases.txt`.

**Execution Command:**
```bash
$env:CONTINUE_ON_ERROR="true"; npm run sim:e2e:combat
```

**Design rule:** If a simulation is missing `TEST_CASE` or `TEST_CASE_ID` support, or does not support comma-separated lists, treat that as a design gap. Propose adding it and document the plan before implementing.

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

> [!IMPORTANT]
> **Mandatory State Synchronization:** Before running any scope determination or executing commands, the agent MUST inspect the repository's `scripts/e2e/results/` folder for the most recent `simulation_progress_log_<YYYYMMDD>.md` file. The agent MUST parse this physical file, recreate the internal `simulation_progress.md` artifact in the brain, and resume exactly from the last pending or in-progress simulation queue item. This synchronization is critical to preserve the simulation state across agent swaps or active branches.

### Step 1 — Determine scope

| User intent | Command |
|---|---|
| Full game validation | `npm run sim:e2e` |
| Combat only | `npm run sim:e2e:combat` |
| Specific domain | `npm run sim:e2e:gyms`, `npm run sim:e2e:breeding`, etc. |
| Single failing simulation | env var filter or `npm run sim:e2e -- -g "<name>"` |

**Fuzzer rule:** The fuzzer (`sim:fuzzer`) always regenerates and writes certified cases to disk by default. To preserve the existing cached cases for quick iterative testing, the user must explicitly set `SKIP_REGENERATE=true` or `REGENERATE_CASES=false`. `ensure_fuzzer_cases.ts` handles this check automatically.

**Important Fuzzer Regeneration Rule:** If the fuzzer is executed again and regenerates the certified cases, all `TEST_CASE`, `TEST_CASE_ID`, and `TEST_START_FROM_CASE_ID` filters/environment variables are automatically invalidated (deleted) inside `ensure_fuzzer_cases.ts`. This forces a complete E2E simulation run over all regenerated cases to identify any new regressions or bugs.

### Step 2 — Execute and capture output

Always redirect output to `scripts/e2e/results/` so results are preserved for analysis:

```bash
npm run sim:e2e:combat:report     # -> scripts/e2e/results/e2e_simulation_failures.json
npm run sim:combat:all:report     # -> scripts/e2e/results/playwright_report.txt

# Or manually for a specific spec:
npm run sim:e2e -- scripts/e2e/battle/battle_fsm_sync.sim.ts 2>&1 | tee scripts/e2e/results/sim_run_$(date +%s).txt
```

### Step 3 — On failure: the fix loop

```
DETECT failure in simulation X
  |
ANALYZE: read the test carefully. Understand what game behavior it asserts.
  |
STUDY SHOWDOWN: Consult first the local Showdown source code in external/pokemon-showdown-code/
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

> [!WARNING]
> **THE COLLECTIVE SUCCESS RULE (ONE TEST PASSING DOES NOT MAKE A SUITE):**
> Just because a single simulation run or a specific test case passes successfully after applying a fix **DOES NOT mean the issue is resolved or that other tests will pass**. A local fix can easily destabilize other combat sequences or active states. Never mark a task as completed or report success based on a single case passing. You must continue running the entire simulation queue and the full combat E2E suite consecutively until **all tests in the suite pass together with zero failures**.

**Fuzzer Regeneration during Fix Loop (CRITICAL):** If at any point during the fix loop the fuzzer is run again (regenerating `fuzzer_certified_cases.json`), the specific `TEST_CASE` / `TEST_CASE_ID` you were debugging is **completely invalidated** (it no longer exists in the newly generated file). You **MUST NOT** attempt to re-run or filter by that old case ID. Instead, you must immediately run a full simulation (`npm run sim:e2e:combat`) to discover the new case mappings and verify the fix against the new suite.

**MANDATORY: Unit-Test First & Pre-Simulation Validation Rules**
1. **Never skip reproducing tests:** Whenever a simulation fails or a bug is reported, you MUST first create or update a unit test (or lightweight Node test) that successfully reproduces the failure BEFORE applying any fix to `src/`.
2. **Never run E2E simulations on untested code changes:** Any code edits in `src/` must first be validated by executing and passing the unit/integration tests (`npm run test` or specific file path test) BEFORE proposing or running any browser-based E2E Playwright simulations. This saves time and computational resources.

After all individual fixes pass, **run the full E2E suite once more** to catch
regressions before reporting completion.

### Step 4 — Final report

Generate `scripts/e2e/results/simulation_report_<timestamp>.md`:

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
- Cancel or kill any running E2E simulation or background task autonomously without explicit user approval. Even if a run takes a long time, the agent must let it run and wait.
- Wipe, clear, or recursively delete the failures directory (`scratch/e2e_failures`) or E2E reports from previous runs if they contain diagnostic data that hasn't been analyzed or backed up yet.

**The simulation is law. src/ must conform.**

---

## Adding New Fuzzer Scenarios vs. New Playwright Specs

### Combat coverage gaps -> fuzzer first
Add scenarios to `scripts/e2e/fuzzer/scenarios/` (ability-scenarios, team-generator,
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
1. New `src/` features with no corresponding simulation (check `scripts/e2e/` domain folders).
2. Untested moves, abilities, items, or mechanics in all fuzzer coverage and simulation report files (such as fuzzer_moves_coverage_report.json, fuzzer_abilities_coverage_report.json, fuzzer_items_coverage_report.json, or fuzzer_report.txt).
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
