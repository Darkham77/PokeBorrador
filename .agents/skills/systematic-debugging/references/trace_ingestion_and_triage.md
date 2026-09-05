# Trace Ingestion & Bug Triage Guide

This reference document details the operational protocols for ingesting, parsing, and triaging bug reports and execution traces in Poké Vicio.

---

## 1. Trace Sources & Extraction Protocols

Bugs arrive through three distinct channels: Playwright E2E simulation failures, headless fuzzer desynchronizations, or manual/verbal developer reports.

### A. Playwright Simulation Failures

When a browser simulation fails (`npm run sim:e2e` or targeted family):

1. **Failure Artifacts (`scratch/test-results/`)**:
   - Inspect the subfolder matching the failing simulation name (e.g. `scratch/test-results/battle-battle_forced_switch_ui-.../`).
   - Read the console logs (`test-failed-1.png`, trace archives, standard error output).
2. **Checkpoint State (`scripts/e2e/results/e2e_checkpoints.json`)**:
   - Inspect the recorded checkpoint object:
     ```json
     {
       "suiteRelativePath": "scripts/e2e/battle/battle_forced_switch_ui.simulation.ts",
       "driver": "sqlite",
       "failedTestTitle": "Lote de fuzzer #14...",
       "failedBatchIndex": 14,
       "errorSnippet": "Timeout 10000ms exceeded waiting for locator('#switch-menu-btn')"
     }
     ```
3. **Trace Analysis**:
   - Identify whether the timeout hit `MAX_PER_ACTION_TIMEOUT_MS = 10000`.
   - **Remember**: A 10s timeout is 100% guaranteed to be a missing event dispatch (`GAME_UI_EVENTS`), missing GSAP `onComplete` trigger, or unmounted ID locator in `src/`, NEVER a time shortage.

### B. Headless Fuzzer Failures & Battle Replayer Desyncs

When a fuzzer or replayer crashes (`npm run sim:fuzzer` or `npm run test`):

1. **Certified Cases Artifact (`scripts/e2e/results/fuzzer_certified_cases.json`)**:
   - Read the failing case ID (`case-xxx`) or batch index.
   - Extract the static case parameters:
     - `seed`: Showdown PRNG seed (e.g. `[1, 2, 3, 4]`).
     - `playerTeam` & `enemyTeam`: Custom Pokémon sets with moves, stats, abilities, and UIDs.
     - `history`: Turn-by-turn history array containing `p1ActiveUid`, `p2ActiveUid`, `p1MoveId`, `p2MoveId`, `p1Volatiles`, `p1Status`, `p1Hp`, `p2Hp`.
     - `playerChoices` & `enemyChoices`: Sequential choice strings (e.g. `['move 1', 'switch 2']`).
2. **Loud Desync Error**:
   - Read the exact un-truncated `[E2E-DESYNC]` or assertion error message to isolate the diverging turn index.

### C. Manual or Verbal Bug Reports

When a developer reports a bug verbally without a stack trace (e.g. *"The switch menu locks up against Gym Leader Brock"*):

1. **Pre-Execution Check**: DO NOT immediately launch heavy simulation suites or full test runs.
2. **Request Minimal Context**: Prompt the user for the 3 minimal missing items:
   - **Step-by-step reproduction sequence**: What actions were performed in what order?
   - **Game state & team context**: Active Pokémon, bench party, game mode (Wild encounter, Trainer, Gym, GTS).
   - **Observed behavior vs Expected behavior**: Exact error message or visual freeze in the DevTools console.

### D. Database & Persistence Failures (Multi-Engine Triage)

When a failure involves storage, SQL migrations, schemas, query builders, or persistence roundtrips:

1. **Identify the Storage Boundary**:
   - Client SQLite (WASM / OPFS / `node:sqlite`).
   - Remote Supabase / PostgreSQL (Docker ephemeral container on port 54329).
   - DBRouter abstraction (`src/logic/db/dbRouter.ts`).
2. **Determine Engine-Specific vs Divergent Failure**:
   - **SQLite-Specific Pitfalls**: Parameter binding (`undefined` vs `null`), deep nested JSON recursion limits, missing table recreate steps in migrations, missing local schema columns.
   - **PostgreSQL-Specific Pitfalls**: Undeclared PL/pgSQL loop variables, silent empty sets due to missing RLS SELECT policies, missing `GRANT EXECUTE` on RPCs, double-stringified JSONB scalars, or composite unique constraint conflicts.
   - **Divergence Pitfalls**: A query, migration, or constraint that succeeds in SQLite but aborts transactions in PostgreSQL (or vice versa). Both engines MUST behave identically at the application layer.
3. **Inspect Active Database Traces**:
   - Check `scratch/audits/latest_audit.json` for persistence auditor warnings.
   - Check Docker container logs: `docker logs pokevicio-test-postgres` if container is running.
   - Extract raw SQL statement, error code (`23505`, `42P01`, `SQLITE_ERROR`), and bound parameter array.

---

## 2. DOX Contract Mapping (`dox-navigator`)

Before touching any code or formulating hypotheses, identify the authoritative contract governing the failing component:

1. **Walk the DOX Hierarchy**:
   - From repository root `AGENTS.md`, navigate down to the owning directory:
     - Battle engine / Showdown logic: `src/logic/battle/AGENTS.md`
     - Global & game stores: `src/stores/AGENTS.md`
     - UI components & views: `src/components/AGENTS.md` / `src/views/AGENTS.md`
     - Persistence & SQLite: `database/AGENTS.md` / `src/logic/auth/AGENTS.md`
2. **Consult Specialized Reference Manuals**:
   - Check [.agents/skills/project-standards/references/rules/](file:///home/franco/Trabajos/PokeBorrador/.agents/skills/project-standards/references/rules/README.md) for applicable engine laws:
     - `testing_and_simulations.md`: Passive joystick, 10s timeout, zero timers.
     - `game_engine_and_state.md`: Showdown canonical rules, 4-seat generalization, UID parity.
     - `database_and_persistence.md`: DBRouter context isolation, Save Shield.
     - `typescript_conventions.md`: Domain-type-first, zero any, zero fallbacks.

---

## 3. Pre-Fix Fallback Audit

Before writing tests or modifying `src/`, inspect the execution path:
- Search for masking fallbacks (`||`, `??`, default assignments, or `.catch(() => true)`).
- If present, remove them immediately so that the test harness and engine fail fast and loudly with an explicit, traceable error message.
