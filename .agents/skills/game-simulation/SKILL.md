---
name: game-simulation
description: >
  MANDATORY orchestrator for all E2E game simulations, battle replay tests, fuzzer
  verifications, Showdown 1:1 parity source code audits, and simulation bugfixes across both Spanish and English.
  YOU MUST trigger this skill whenever the user or task mentions running simulations,
  verifying E2E, checking game tests, fuzzer certification, auditing Showdown parity, or debugging simulation failures
  (e.g., "correr simulaciones", "simular", "simulaciones", "falló la simulación",
  "depura la simulación", "verificar simulaciones", "probar el juego contra tests",
  "continua", "continúa", "sigue", "reanudar", "sim:e2e", "sim:fuzzer", "sim:audit",
  "audit-simulations", "auditar paridad", "auditar showdown", "comparar con showdown",
  "showdown parity audit", "1:1 parity audit", "external/pokemon-showdown-code",
  "run simulations", "run e2e", "check the game against tests", "detect bugs via simulation",
  "verify game behavior", "battle fsm sync", "replay test", or any *.simulation.ts file).
  Governs the full immutable 7-step cycle: execute -> detect failure -> isolate case & write
  static Vitest RED reproduction test -> fix src/ -> verify GREEN in Vitest -> re-run ONLY
  affected file in Playwright -> final master regression pass.
  ALWAYS use this skill instead of running test commands ad-hoc.
---

# Game Simulation Orchestrator

Orchestrates the game simulation, E2E pipeline, and Showdown 1:1 parity source code audit with a single goal: **make the game match what `@pkmn/sim` (Pokémon Showdown) says is correct.** Simulations and canonical Showdown code are the source of truth. `src/` must conform to them, never the reverse.

---

## 🚦 Paso 0: Protocolo de Diagnóstico y Reanudación de Estado (Physical First)

Whenever instructed to start, resume, or continue a simulation workflow (e.g. *"continua"*, *"sigue"*, *"reanudar"*, or after a context refresh):

### 1. Physical Log Synchronization First
- Locate the most recent physical progress log on disk:
  `scripts/e2e/results/simulation_progress_log_<YYYYMMDD>.md` (sorted by date).
- **Physical SSoT**: Prioritize this physical repository file over any memory state to restore execution progress, active suite status, and pending tasks.
- Synchronize/recreate the brain's internal `simulation_progress.md` artifact from this physical file before issuing any simulation command.

### 2. Checkpoint Inspection
- Read `scratch/e2e_checkpoints.json`.
- Identify:
  - `doc.master.suiteIndex` and `doc.master.suiteName`: current master sequence position.
  - `doc.suites[suiteKey].failedBatchIndex`: whether an intra-suite failure is actively being repaired.

### 3. Delimitation of Invocation Commands (Strict Semantics)

| Scenario | Command | Meaning & Rules |
|---|---|---|
| **A. Ordinary Resume** | `npm run sim:e2e` | Resumes from master cursor in `e2e_checkpoints.json`. **NEVER use `clean=true`**. |
| **B. Active Suite Resume** | `npm run sim:e2e filter=<suite>` | Resumes failing suite from `failedBatchIndex` (Step 6A). |
| **C. Suite Clean Pass (Paso 6B)** | `npm run sim:e2e filter=<suite> clean=true` | **STRICTLY RESERVED FOR REPAIRED SUITE**. Runs clean from case 1 in dual mode. |
| **D. Full Scratch Run** | `npm run sim:e2e clean=true` | Clears all checkpoints. **ONLY on explicit user request to start from zero**. |

> [!CAUTION]
> **PROHIBITION ON AD-HOC SUITE SELECTION DURING RESUME:**
> When the user says "continua" or "sigue", it is **STRICTLY FORBIDDEN** to pick arbitrary suites from `npm run sim:e2e:list` and run them with `clean=true`. Always run `npm run sim:e2e` natively to resume the master pipeline seamlessly.

---

## ⛔ 5 Hard Gates Inviolables (Zero Deviation)

1. **⛔ HARD GATE 1: NO PLAYWRIGHT BEFORE VITEST RED-TO-GREEN & NODE SUITE PASS**:
   - When ANY simulation fails, you **MUST FIRST** create an isolated static unit test in `tests/node/`, reproduce the failure in **RED**, fix `src/`, verify **GREEN**, and pass the entire Node regression suite (`npm run test:node`, 0 regressions).
   - Browser Playwright execution is forbidden until Step 6.
2. **⛔ HARD GATE 2: NO MASTER `npm run sim:e2e` DURING SINGLE-SUITE DEBUGGING**:
   - While investigating or fixing a suite, never run the master suite. Isolate execution strictly to the affected suite via `npm run sim:e2e filter=<suite_name>`.
3. **⛔ HARD GATE 3: `TEST_BATCH` IS BROWSER VERIFICATION (STEP 6), NEVER A UNIT TEST SUBSTITUTE**:
   - `TEST_BATCH` is an optional browser verification tool belonging exclusively to Step 6. It cannot replace the static Node reproduction test in `tests/node/`.
4. **⛔ HARD GATE 4: ZERO COMPATIBILITY FALLBACKS & SILENT CHOICE INTERVENTIONS**:
   - Replayer logic, workers, and battle runners MUST NOT intercept failed/disabled move choices with speculative fallbacks (`||`, `??`, default assignments). Fail fast and loudly (`throw new Error(...)`).
5. **⛔ HARD GATE 5: MANDATORY CLOSED-LOOP REPAIR & DUAL CLEAN ZERO PASS (PASO 6B)**:
   - A failure is an immediate trigger for the repair cycle: RED reproduction -> Fix `src/` -> GREEN -> Node regression -> Resume to end (6A) -> **Dual clean pass from zero on that suite (6B)**:
     1. `[6B 1/2 SQLite]`: Clean pass from Case #1 on SQLite.
     2. `[6B 2/2 PostgreSQL]`: Clean pass from Case #1 on PostgreSQL.
   - Advance to the next suite ONLY after 100% dual pass from case 1.

---

## 🔄 El Ciclo Canónico de 7 Pasos (Lifecycle Flow)

```mermaid
flowchart TD
    Start(["Start Game Simulation Pipeline"]) --> FuzzerCheck{"Certified cases exist & logic unchanged?"}
    FuzzerCheck -- "No / Code Changed" --> RunFuzzer["1. Run Fuzzer: npm run sim:fuzzer"]
    RunFuzzer --> ValidateFuzzer["Validate Certified Cases: npm run sim:fuzzer:validate"]
    ValidateFuzzer --> RunE2E["2. Run E2E Simulation Suite: npm run sim:e2e"]
    FuzzerCheck -- "Yes" --> RunE2E
    RunE2E --> E2ECheck{"Any Simulation Failed?"}
    E2ECheck -- "No (All Green)" --> Done(["Pipeline 100% Certified!"])
    E2ECheck -- "Yes (Failure Detected)" --> IsolateCase["3. Stop Suite & Isolate Specific Failing Family & Case ID"]
    IsolateCase --> ExtractFixture["4. Extract Static Fixture & Write Unit Test in tests/node/"]
    ExtractFixture --> RunRED["Run Unit Test -> Confirm RED Failure: npm run test"]
    RunRED --> FixCode["5. Diagnose Root Cause: Fix src/ OR Harden Base Simulation by Inheritance"]
    FixCode --> RunGREEN["Re-run Unit Test -> Confirm GREEN"]
    RunGREEN --> RunNodeRegression["5.5. Run Full Node Suite: npm run test:node (0 regressions)"]
    RunNodeRegression --> ReRunResume["6A. Fast-Forward Resume from Checkpoint to End of Suite"]
    ReRunResume --> FamilyCheck{"More Failures in this Suite?"}
    FamilyCheck -- "Yes" --> IsolateCase
    FamilyCheck -- "No (Reached End)" --> CleanSuitePass["6B. Mandatory Clean Pass from ZERO: npm run sim:e2e filter=... clean=true"]
    CleanSuitePass --> CleanPassCheck{"100% PASS from Zero in Dual Mode?"}
    CleanPassCheck -- "No" --> IsolateCase
    CleanPassCheck -- "Yes" --> RecordLedger["6C. Record Fix in Commit Ledger"]
    RecordLedger --> RunMasterE2E["7. Re-run Full Master E2E Suite: npm run sim:e2e"]
    RunMasterE2E --> E2ECheck
```

### Detailed Step Protocols
1. **Paso 1: Fuzzer Execution & Regeneration** (`npm run sim:fuzzer` / `npm run sim:fuzzer:validate`):
   - Mandatory on clean runs or when battle engine logic (`src/logic/battle/`) changes.
2. **Paso 2: E2E Simulation Execution** (`npm run sim:e2e`):
   - Executes dynamic sequential suites. Halts immediately on the first error.
3. **Paso 3: Isolate Failing Suite and Case ID**:
   - Halt master run. Identify exact suite name, batch index, and case ID from failure logs.
4. **Paso 4: Create Isolated RED Reproduction Test** (`tests/node/`):
   - Extract static case parameters (`seed`, teams, turn choice streams from `history`) into a static fixture or test file. Verify deterministic failure in **RED** via Vitest.
5. **Paso 5: Fix Root Cause in `src/` & Harden Base Harness**:
   - Fix upstream root cause without fallbacks. Verify reproduction test turns **GREEN**.
6. **Paso 5.5: Full Node Unit Regression Check** (`npm run test:node`):
   - Run entire Node test suite. Must report 100% GREEN (0 regressions) before browser testing.
7. **Paso 6A: Fast-Forward Resume from Checkpoint**:
   - Run `npm run sim:e2e filter=<suite_name>` to resume from `failedBatchIndex` through end of suite.
8. **Paso 6B: Mandatory Dual Clean Zero Intra-Suite Regression Pass**:
   - Run `npm run sim:e2e filter=<suite_name> clean=true`.
   - Must pass 100% from case 1 in both SQLite and PostgreSQL.
9. **Paso 6C: Record Fix in Commit Ledger**:
   - Record the repaired bug in `simulation_progress.md` and mirror to physical log.
10. **Paso 7: Full Master Resumption**:
    - Run `npm run sim:e2e` to advance to the next suite until all 58+ suites are certified.

---

## 📊 Gobernanza del Artefacto de Progreso y del Commit Ledger

Every simulation run maintains `simulation_progress.md` in the brain, mirrored to `scripts/e2e/results/simulation_progress_log_<YYYYMMDD>.md`:

### Dynamic Simulation Table
- Always generate via `npm run sim:e2e:table` (scans all `*.simulation.ts`, counts cases dynamically, sorts by complexity).

### Commit Ledger Mandates (Zero-Pollution)
- **Starts 100% Empty (0 rows)**: When initiating a simulation pass, the Commit Ledger MUST be empty.
- **Strictly Reserved for Active Simulation Failures**: Rows are added **IF AND ONLY IF** a simulation fails in this active run and is repaired through the 7-step cycle.
- **Prohibition on Historical Pollution**: Backfilling, pre-populating, or copying past manual features or bugs into the Commit Ledger is **STRICTLY FORBIDDEN**.
- **Preserved Intra-Run**: Once recorded after Step 6B, entries are preserved throughout the run until the final commit.

---

## 🔍 Herramienta de Auditoría de Paridad 1:1 con Showdown (`npm run sim:audit`)

La auditoría de paridad compara el código fuente canónico de Pokémon Showdown en `external/pokemon-showdown-code/` contra `src/` para detectar y resolver divergencias reales de comportamiento (sin fabricar falsos positivos ni usar fallbacks):

### Metodología de Auditoría
- **Suite Diagnóstica**: Ejecutar `npm run sim:audit` (`scripts/maintenance/audit_showdown/run_audit_suite.ts`) para escanear violaciones automatizadas en tokens, estados FSM, boosts y fórmulas.
- **El Mandato de Dos Etapas**:
  1. *Etapa 1 (Investigación)*: Inspección línea por línea hasta listar ≥20 sospechosos concretos (*"Showdown hace X pero src/ hace Y"*).
  2. *Etapa 2 (Confirmación RED)*: Escribir y ejecutar un test para cada sospechoso en `tests/unit/battle/parity/`. Si pasa en GREEN en la primera corrida, NO es un bug (descartar). Si falla en **RED**, catalogar en la Tabla Maestra 1:1.
- **Prohibiciones Absolutas**: Cero catalogación sin fallo RED previo, prohibición estricta de inventar bugs para llenar cuotas, prohibición de fallbacks (`||`, `??`), y cero strings desnudos para dominios finitos.
- Consultar la guía completa en [showdown_parity_audit_guide.md](./references/showdown_parity_audit_guide.md).

---

## 🏛️ Directivas e Invariantes Centrales

- **Límite Estricto de 10s por Acción (`MAX_PER_ACTION_TIMEOUT_MS = 10000`)**: Input response window strictly capped at 10s. A timeout is NEVER a time shortage; it is an empirical bug in `src/`. Engine turn processing (`isProcessing.value`) resets inactivity watchdog.
- **Ley del Joystick Pasivo & Selectores 100% por ID/UID**: Simulators only react to explicit FSM readiness states. All elements located strictly by `#<id>` or `data-pokemon-uid="${uid}"`. Text/regex matching is forbidden. Official keyboard activation (`Enter`).
- **Sincronización por Eventos Tipados & Cero-Timers**: Timers (`setTimeout`, `sleep`) forbidden in UI. Synced exclusively via typed events (`battle-ready-for-input`, `GAME_UI_EVENTS`) coordinated with GSAP `onComplete`.
- **Aceleración Universal GSAP a 100x**: `gsap.globalTimeline.timeScale(100)` enforced in simulations.
- **Paridad Multimotor y Ejecución Serial**: Dual driver model (SQLite in-memory WASM + PostgreSQL Docker). Drivers execute strictly in series: `[1/2 SQLite]` then `[2/2 PostgreSQL]`.
- **Aislamiento de Puerto 5174**: E2E simulations strictly use port 5174 (`npx kill-port 5174`).
- **Auto-Arranque Proactivo de Docker**: Automatically starts Docker if stopped when PostgreSQL runs.
- **Prohibición de Mockeo Tautológico**: Never mock the subsystem under test (`showdownWorkerClient.ts`, `@pkmn/sim`). Real engine parity is mandatory.
- **No-Test Mandate for Documentation**: Strictly forbidden to run `test` or `sim:e2e` when editing `.md` or skills. Use only `npm run audit:md`.

---

## 📚 Índice de Módulos de Referencia Especializados (`references/`)

Para consultar los esquemas técnicos completos, tablas de comandos y arquitecturas en profundidad sin resumen ni pérdida mecánica:

| Módulo de Referencia | Contenido y Gobernanza | Enlace |
|---|---|---|
| **Directivas e Invariantes** | Límites de timeout, joystick pasivo, selectores `#id`/UID, esquema `history`, legalidad Showdown, conservación PP, reglas de huida, aserción visual `.toBeVisible()`. | [simulation_directives_and_invariants.md](./references/simulation_directives_and_invariants.md) |
| **Arquitectura de Fuzzers** | Capa 0 fuzzer, árbol de dependencias, ciclo de vida IPB, heurísticas cooperativas, pool de páginas por worker y estándar de reseteo en 7 pilares (`WorkerSessionPool`). | [fuzzer_architecture_and_heuristics.md](./references/fuzzer_architecture_and_heuristics.md) |
| **CLI y Solución de Problemas** | Diccionario completo de scripts NPM (Capas 0–3), filtros de casos (`TEST_CASE_ID`, `TEST_BATCH`), ruta rápida headless, depuración masiva, auto-arranque Docker, puerto 5174. | [cli_and_troubleshooting.md](./references/cli_and_troubleshooting.md) |
| **Estándares de Testing** | Protocolo en 3 niveles, ley anti-mockeo tautológico, mandato no-test para docs, concurrencia adaptativa, taxonomía de tests, ley anti-fragmentación, des-JSDOMización, cinemática GSAP. | [simulation_testing_standards.md](./references/simulation_testing_standards.md) |
| **Auditoría de Paridad Showdown** | Metodología de comparación línea por línea con `external/pokemon-showdown-code/`, mandato de dos etapas (≥20 sospechosos -> confirmación RED), suite diagnóstica `npm run sim:audit`, tabla maestra de bugs y checklist. | [showdown_parity_audit_guide.md](./references/showdown_parity_audit_guide.md) |
