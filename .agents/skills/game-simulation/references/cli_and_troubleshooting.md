# CLI, Environment & Troubleshooting

> **Scope & Authority**: This reference document provides the comprehensive dictionary of all simulation CLI commands, orchestrator parameters, headless debug paths, multi-error logging modes, Docker auto-start procedures, and environment troubleshooting protocols across Poké Vicio.
>
> 🛑 **Parent Skill**: [game-simulation](../SKILL.md)

---

## 1. Complete NPM Script Reference by Execution Layer

### Layer 0: Fuzzers & Headless Replayers
| Script | Command | Purpose |
|---|---|---|
| `sim:fuzzer` | `npm run sim:fuzzer` | Master runner: executes all domain fuzzers, regenerates `fuzzer_certified_cases.json` |
| `sim:fuzzer:moves` | `npm run sim:fuzzer:moves` | Moves coverage fuzzer |
| `sim:fuzzer:abilities` | `npm run sim:fuzzer:abilities` | Abilities coverage fuzzer |
| `sim:fuzzer:items` | `npm run sim:fuzzer:items` | Held items coverage fuzzer |
| `sim:fuzzer:scenarios` | `npm run sim:fuzzer:scenarios` | Complex ability scenarios fuzzer |
| `sim:fuzzer:breeding` | `npm run sim:fuzzer:breeding` | Daycare egg breeding fuzzer |
| `sim:fuzzer:missions` | `npm run sim:fuzzer:missions` | Daily mission progression fuzzer |
| `sim:fuzzer:gyms` | `npm run sim:fuzzer:gyms` | Gym leader progression fuzzer |
| `sim:fuzzer:gts` | `npm run sim:fuzzer:gts` | Global Trade System transactions fuzzer |
| `sim:fuzzer:ai` | `npm run sim:fuzzer:ai` | Heuristic battle AI decision fuzzer |
| `sim:fuzzer:trace` | `npm run sim:fuzzer:trace` | Fast headless case replayer in pure Node (1-2s execution) |
| `sim:fuzzer:validate` | `npm run sim:fuzzer:validate` | Validates all terminal cases in `fuzzer_certified_cases.json` |
| `sim:audit` | `npm run sim:audit` | Showdown 1:1 parity diagnostic scanner across engine & FSM |

### Layers 1 & 2: Unit & Parity Tests
| Script | Command | Purpose |
|---|---|---|
| `test:node` | `npm run test:node` | All `tests/node/**/*.test.ts` via native `node:test` (100% green required) |
| `test` | `npm run test` | Full Vitest test suite (`unit` + `node` workspace projects) |

### Layer 3: Playwright E2E Simulations
| Script | Command | Purpose |
|---|---|---|
| `sim:e2e` | `npm run sim:e2e` | Dynamic sequential execution across all 58+ suites (dual driver SQLite + Postgres, halts on 1st error) |
| `sim:e2e:table` | `npm run sim:e2e:table` | Scans `scripts/e2e/`, counts cases, sorts by complexity, prints markdown table |
| `sim:e2e:list` | `npm run sim:e2e:list` | Lists all discovered simulation suites and case counts |
| `sim:e2e:combat` | `npm run sim:e2e:combat` | Combat core suites (`battle_fsm_sync`, `battle_manual_scenarios`, `battle_locked_moves`) |
| `sim:e2e:combat:report` | `npm run sim:e2e:combat:report` | Combat core simulation with output redirected to log |
| `sim:e2e:capture` | `npm run sim:e2e:capture` | Wild encounters and capture mechanics simulation |
| `sim:e2e:capture:report` | `npm run sim:e2e:capture:report` | Wild capture simulation with log redirection |
| `sim:e2e:pvp` | `npm run sim:e2e:pvp` | PvP combat simulation suites |
| `sim:e2e:pvp:report` | `npm run sim:e2e:pvp:report` | PvP simulation with log redirection |
| `sim:e2e:ai` | `npm run sim:e2e:ai` | Heuristic battle AI simulation (`heuristic_ai.simulation.ts`) |
| `sim:e2e:search` | `npm run sim:e2e:search` | Wild encounter search loop sequential simulation |
| `sim:e2e:search:report` | `npm run sim:e2e:search:report` | Search loop simulation with log redirection |
| `sim:e2e:abilities` | `npm run sim:e2e:abilities` | Field and combat abilities simulation suites |
| `sim:e2e:items` | `npm run sim:e2e:items` | Bag and inventory items simulation suites |
| `sim:e2e:gts` | `npm run sim:e2e:gts` | GTS trade listings and transaction simulation suites |
| `sim:e2e:save` | `npm run sim:e2e:save` | Persistence, SaveCoordinator and save shield simulation suites |
| `sim:e2e:breeding` | `npm run sim:e2e:breeding` | Daycare deposit and egg hatching simulation suites |
| `sim:e2e:missions` | `npm run sim:e2e:missions` | Daycare mission lifecycle simulation suites |
| `sim:e2e:gyms` | `npm run sim:e2e:gyms` | Gym progression and badge unlock simulation suites |
| `sim:e2e:events` | `npm run sim:e2e:events` | Contests, tournaments and reward claims simulation suites |
| `sim:e2e:pokemon` | `npm run sim:e2e:pokemon` | Box management, summary and evolution simulation suites |
| `sim:e2e:system` | `npm run sim:e2e:system` | System options, audio and authentication simulation suites |

---

## 2. Orchestrator Parameters & Invocation Syntax

The master runner `scripts/e2e/run_sequential_simulations.ts` accepts clean `key=value` parameters without `--`:

### Parameters Reference
- `filter=<suite_name>`: Filters execution to a single suite (or pattern) while preserving canonical global progress.
- `from=<n|name>`: Resumes sequential execution from a specific suite index (e.g. `from=24`) or suite file basename (e.g. `from=save_shield_restrictions`).
- `clean=true` / `reset=true`:
  - **With `filter=<suite>`**: Cleans checkpoints exclusively for that specific suite (Step 6B regression verification).
  - **Without `filter`**: Clears all checkpoints to force execution from Suite 1 (full scratch run).
- `driver=dual` (default) | `driver=sqlite` | `driver=postgres`: Database engine selector.

### Examples by Operating System

#### POSIX / Linux / macOS (Terminal)
```bash
# 1. Full Dual-Driver Certification from Scratch:
npm run sim:e2e clean=true

# 2. Targeted Suite Execution (resumes from checkpoint if present):
npm run sim:e2e filter=search_loop_sequential

# 3. Clean Suite Execution from Zero (Step 6B on Repaired Suite):
npm run sim:e2e filter=search_loop_sequential clean=true

# 4. Resume Master Pass from a Specific Suite:
npm run sim:e2e from=24
npm run sim:e2e from=save_shield_restrictions

# 5. Fast Headless Case Trace (1-2s):
TEST_CASE_ID="case-47212c07bc5d" npm run sim:fuzzer:trace
```

#### Windows (PowerShell)
```powershell
# 1. Full Dual-Driver Certification from Scratch:
npm run sim:e2e clean=true

# 2. Targeted Suite Execution (resumes from checkpoint if present):
npm run sim:e2e filter=search_loop_sequential

# 3. Clean Suite Execution from Zero (Step 6B on Repaired Suite):
npm run sim:e2e filter=search_loop_sequential clean=true

# 4. Resume Master Pass from a Specific Suite:
npm run sim:e2e from=24
npm run sim:e2e from=save_shield_restrictions

# 5. Fast Headless Case Trace (1-2s):
$env:TEST_CASE_ID="case-47212c07bc5d"; npm run sim:fuzzer:trace
```

---

## 3. Filtering Individual Test Cases & Performance Golden Rules

### Case Filter Variables
```bash
# For Playwright E2E Browser Simulation:
TEST_CASE=<case-id>                 # Run only this case (or comma-separated list)
TEST_CASE_ID=<case-id>              # Run only this case (or comma-separated list)
TEST_START_FROM_CASE_ID=<id>        # Start from this case onward
TEST_BATCH=<n>                      # Run only batch N (e.g. 1, 9, 17, 25)

# For Headless Debugging (Pure Node.js, 1-2 seconds):
TEST_CASE_ID=<case-id>              # Run headless replayer for specific case(s)
```

> [!CAUTION]
> **PROHIBITION OF -g / --grep IN PLAYWRIGHT:**
> It is strictly forbidden to use Playwright's `-g` or `--grep` flag to filter individual test cases (e.g. `npx playwright test -g "batch #10"`). Using `-g` can spawn misconfigured parallel worker threads without properly initializing batch state variables. Always use the project's official environment variables (`TEST_BATCH`, `TEST_CASE_ID`).

> [!IMPORTANT]
> **GOLDEN RULE OF TESTING PERFORMANCE:**
> 1. **ALWAYS PREFER HEADLESS REPLAY FIRST:** When diagnosing combat logic, HP parity, FSM transitions, or choice streams, **NEVER** launch the full browser initially (`npm run sim:e2e:combat`). Always use the headless trace replayer (`TEST_CASE_ID=<id> npm run sim:fuzzer:trace`), which finishes in 1–2 seconds in pure Node.js.
> 2. **MULTI-CASE FILTERING:** Execute multiple failing cases simultaneously by separating them with commas:
>    `TEST_CASE_ID="case-47212c07bc5d,case-006487488a68" npm run sim:fuzzer:trace`
> 3. **RESERVE PLAYWRIGHT FOR FINAL VERIFICATION:** Reserve Playwright browser execution exclusively for Step 6 (final regression verification) or for testing reactive UI/visual behaviors (modals, GSAP animations, HUD settling).

---

## 4. E2E Multi-Error Logging Mode (Mass Debugging)

To analyze multiple E2E battle bugs simultaneously and detect common root causes without early termination, run the E2E suite with `CONTINUE_ON_ERROR=true`:

```powershell
# Windows (PowerShell):
$env:CONTINUE_ON_ERROR="true"; npm run sim:e2e:combat
```
```bash
# POSIX / Linux / macOS:
CONTINUE_ON_ERROR="true" npm run sim:e2e:combat
```

When `CONTINUE_ON_ERROR=true` is active:
1. Playwright tests intercept FSM/HP/parity errors, write them to `scripts/e2e/results/e2e_failures/`, and exit the test block cleanly.
2. This bypasses Playwright's `maxFailures: 1` setting, allowing all cases in the suite to execute.
3. At completion, all failure data is consolidated into `scripts/e2e/results/e2e_simulation_failures.json` and a readable summary at `scripts/e2e/results/failed_e2e_cases.txt`.

---

## 5. Proactive Docker Auto-Start Protocol

When running simulations requiring PostgreSQL (`driver=postgres` or `driver=dual`), the test harness and agent **MUST NEVER** abort or ask the user to manually start Docker if the daemon is inactive. The agent and scripts MUST proactively start Docker automatically:

- **Windows (PowerShell)**:
  ```powershell
  # Launch Docker Desktop application:
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  # Or start the Windows service:
  Start-Service com.docker.service -ErrorAction SilentlyContinue
  ```
- **Linux / macOS**:
  ```bash
  systemctl --user start docker || sudo systemctl start docker || open -a Docker
  ```
- Poll `docker info` until the daemon responds, and verify container readiness before proceeding with PostgreSQL runs.

---

## 6. Environment & Tooling Troubleshooting

### Dedicated Port 5174 Isolation
- All E2E simulations and Playwright runners strictly operate on port `5174` (`https://localhost:5174`).
- Port `5173` is strictly reserved for developer interactive use.
- Freeing port 5174: `npx kill-port 5174` (killing port 5173 is strictly forbidden).

### Playwright Browser & Dependency Installation
If Playwright fails due to missing browsers, missing system libraries, or missing `ffmpeg`:
```bash
npx playwright install --with-deps
```
This command installs the required browser binaries along with all necessary system libraries.

---

## 7. Rules for Modifying Tests vs. `src/`

### Allowed: Modify E2E Specs or Fuzzers To...
- Add `console.debug` or descriptive error logging for diagnosis.
- Add new fuzzer scenarios (new abilities, items, edge cases).
- Improve event emission or listeners when a real synchronization defect is found (never add polling or increase timeouts).
- Add missing `TEST_CASE` / domain filter support.
- Extend test coverage without weakening any existing assertion.

### FORBIDDEN: Modify E2E Specs or Fuzzers To...
- Weaken, relax, or remove an assertion to make `src/` pass.
- Skip, comment out, or ignore a failing scenario.
- Change an expected value to match incorrect `src/` behavior.
- Add a `try/catch` that silences a desync or failure.
- Add fallback values, default return objects, or recovery patches in `src/` or helper scripts (e.g. default coordinates, default objects).
- Bypass a state-parity check.
- Use silent mock/patch workarounds in E2E tests, helper scripts, or test workers that automatically rewrite choices when state desynchronizes.
- Hardcode FSM state transitions or manually manipulate FSM state variables to force tests to pass.
- Increase, inflate, or relax timeouts beyond 10 seconds.
- Cancel or kill any running E2E simulation or background task autonomously without explicit user approval.
- Wipe or delete the failures directory (`scratch/e2e_failures`) without analyzing and backing up diagnostic data.

**The simulation is law. `src/` must conform.**
