# Validation and Quality Manual (Poké Vicio)

This manual centralizes all automatic validation protocols to ensure that code and data comply with the project's technical rigor standards.

## ⚔️ Battle and Pokémon Data Validation

### 1. Moves (`MOVE_DATA`)

Any change in `src/data/moves.ts` or in battle logic must be validated:

- **Full Validation**: `npm run validate:moves` (detects duplicates, semantic errors, and learnset integrity).

### 2. Abilities (`ABILITY_DATA`)

- **General Validation**: `npm run validate:abilities` (verifies descriptions, Showdown Dex parity, and implementation in `battleAbilities.ts`).

### 3. Items Integrity

- **Full Audit**: `npm run validate:items` (ensures consistency between `SHOP_ITEMS` and `itemEffects.ts`).

### 4. Battle Engine (FSM)

Any modification to `orchestrator.ts`, `battle.ts`, or the battle state machine MUST pass these audits:

- **Diagram Parity**: `npm run fsm:verify` (detects missing states or broken transitions).
- **Implementation Integrity**: `npm run fsm:audit` (detects race conditions and unimplemented sub-states).
- **Sequential Flow Parity**: `npm run fsm:flow` (ensures the orchestrator follows the manual's Mermaid diagrams 1:1).

---

## 🧪 Testing Standards

Core logic modules and critical system components MUST have dedicated unit tests in `tests/unit/` or `tests/node/`.

1. **Factory Integrity**: Every data factory (e.g., `pokemonFactory.ts`) must be covered by unit tests verifying generation, level-up, and sanitization.
2. **Regression Prevention**: When modifying `src/logic/`, perform a **Test Gap Analysis**; if a module is "worthy" (core behavior), create a new `.spec.ts` file.
3. **Execution**: Run `npm run test`, `npm run test:node`, or `npm run test:e2e` before every commit to ensure 100% pass rate.
4. **Deterministic Environment**: All logic tests dependent on environmental variables (time cycles, seasons, weather) MUST mock `getDayCycle` or `getServerInstant` from `@/logic/timeUtils` to ensure consistent and reproducible results across all timezones and execution hours.

---

## 🛠️ Standards Audit (Unified Engine)

The project uses a unified audit system located in `scripts/audit_project.ts`:

- **Global Audit**: `npm run audit`. Runs all SASS, GPU, and file length checks.
- **Auto-Fix**: `npm run audit:fix`. Repairs common standard violations (Viewports, SASS filters).
- **Full Chain**: `npm run audit:full`. Runs the complete verification chain (Lint + Audit + FSM + Items + Abilities + Moves + SQL).

---

## 🚨 Non-Negotiable Quality Rules

1. **Zero-Warning**: `npm run lint` and `npm run validate:types` MUST return 0 errors and 0 warnings before any commit.
2. **SASS Capitalization (Automated)**: SASS capitalization for CSS filters/transforms (`Scale()`, `Translate()`, etc.) is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build, meaning no manual capitalization or separate linting checks are required.
3. **Dependency Shield**: Any script using external libraries must handle `ImportError` and provide clear installation instructions.
4. **Audit Bypass**: If a violation is intentional by design, use the `// [PureVue-Ignore]` comment. The audit engine checks the **current line and the line immediately above** to support Vue/HTML attributes that span multiple lines.
5. **Large Data and Debug Panel Integrity**: Massive data files (e.g., spawn grids) or large administrative/debug utility panels (e.g., `DebugPokemonCreator.vue`) that exceed 500 lines by design must carry `// [PureVue-Ignore-Length]` at the beginning of the file (or first line of `<script setup>`) to bypass modularization checks during the audit pass.
6. **ESLint Optimization**: To avoid `no-useless-assignment` errors, prefer using ternary operators or immediate-return logic instead of initializing variables with `null` and assigning them within `if/else` blocks.
7. **Database Parity**: Automated sync of SQL migrations via the Vite build process is mandatory. Always verify that `npm run validate:sql` passes after schema changes.
8. **Automated Repair Safety (Click Propagation)**: Repair scripts MUST NOT inject `.stop` modifiers into components that rely on event bubbling (e.g., `PVTooltip`).
9. **Maintenance Script Exemption**: Scripts located in `scripts/` are exempt from legacy audits (e.g., `Date` usage) to facilitate technical migrations and support tasks without triggering false positives.
10. **Store-Level Event Listeners**: Window listeners used in Pinia stores (outside of the Vue component lifecycle) MUST be marked with `// [PureVue-Ignore]` if they cannot be easily replaced by standardized composables.
11. **Computed Atomicity**: NEVER perform state mutations (e.g., `ref.value = ...`) inside a `computed` property. This causes `vue/no-side-effects-in-computed-properties` errors.
12. **Data Structure Refactoring Safety**: Al migrar una estructura de datos crítica (ej: de `Array` a `Object`), es **OBLIGATORIO** realizar un barrido completo del codebase buscando métodos incompatibles como `.includes()`, `.forEach()`, `.map()`, o `.filter()`.
13. **TypeScript Import Rigor**: Triple-slash references (e.g., `/// <reference types="vue" />`) are forbidden in `vite-env.d.ts` or any core file. Use standard ESM imports or `compilerOptions.types` in `tsconfig.json`.
14. **Strict Return paths (TS7030)**: When writing functions in configurations or codebases with strict TypeScript enabled, if any execution path returns a value, all paths must explicitly return a value. For example, in rollup configurations like `manualChunks(id)`, ensure unmatched branches end with a fallback `return;` or `return undefined;` to satisfy the `noImplicitReturns` rule.
15. **Unicode Regex for Emojis**: ESLint in strict mode flags character classes containing multiple combined characters (like emojis with modifiers). ALWAYS use alternation groups `(A|B|C)` instead of character classes `[ABC]` for these symbols to avoid `no-misleading-character-class` errors.
16. **Economy Testing Parity**: When modifying `economyFormulas.ts`, all associated tests (e.g., `shop.spec.ts`, `economyFormulas.test.ts`) MUST be updated to reflect the new formulas (e.g., tier-based costs) to prevent false regression signals.
17. **Import Hygiene Post-Refactor**: After refactoring component logic to use global SASS mixins or variables (e.g., centralizing type colors), it is MANDATORY to remove the corresponding legacy imports (e.g., `PDEX_TYPE_COLORS`) and associated helper functions (e.g., `getTypeColor`) in all affected components.
18. **Validation Script Permission Parity**: All `validate:*` scripts in `package.json` must be offline-first, validating integrity against `@pkmn/sim` (Showdown) and local databases without requiring network permissions (`--allow-net`).
19. **Scratch Folder Mandate**: Any temporary reports, logs, audit outputs, or validation reports MUST be saved exclusively in the `scratch/` directory at the project root to maintain repository cleanliness.
21. **Mermaid Diagram Layout Standards**: To prevent Mermaid from rendering broken, extremely long vertical lines (due to layout engine routing bugs), do NOT draw transition arrows between a nested sub-state inside container A and a nested sub-state inside container B (or sibling top-level container). Keep all related sequential transitions completely contained within the same parent state block, or flatten the diagram blocks entirely. Additionally, avoid redundant sub-nesting of identical state names across multiple sub-state boxes to prevent arrow crossovers (spaghetti layout).
22. **Surgical Fallow Exclusions Policy**: To preserve the capabilities of the Fallow static analysis engine, it is strictly forbidden to use wildcard `*` exclusions (e.g., `"exports": ["*"]`) in `.fallowrc.json`. To prevent automatic fixes (`npx fallow fix`) from stripping legitimate exports required for dynamic resolution or public APIs, such exports must be added surgically, variable by variable, to the `"ignoreExports"` array in `.fallowrc.json`.
23. **Fallow Security Bypass for Safe Local Fetching**: When local static assets (such as audio files in `src/stores/audio.ts`) are fetched dynamically, Fallow's security engine may trigger a false-positive CWE-918 (Server-Side Request Forgery) medium vulnerability. If the fetch target is strictly internal and input is cleaned, this can be bypassed by placing the `// fallow-ignore-file security-sink` comment at the very top of the affected file.
24. **Robust Absolute Symbol Centering**: When positioning text symbols or icons (e.g., clear buttons containing '×') inside absolute elements, avoid relying solely on `line-height: 1` as browser font rendering engines vary and will result in vertical misalignment. ALWAYS use Flexbox centering with explicit size dimensions: `display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; top: 50%; transform: translateY(-50%);`.

---

## 📊 NPM Diagnostic & Maintenance Scripts Reference

Use these scripts to verify project standards, manage servers, and run audits:

### 🛡️ Core Validation

- `npm run validate:types`: TypeScript type integrity verification (Zero Errors).
- `npm run validate:sql`: SQL schema and migration validator against local engine.
- `npm run validate:items`: Integrity audit for item and object databases.
- `npm run validate:items:summary`: Runs item database validation in summary mode.
- `npm run validate:items:report`: Runs item database validation and saves detailed output to `items_report.txt`.
- `npm run validate:abilities`: Semi-integrity validation for abilities database against Showdown Dex.
- `npm run validate:abilities:summary`: Runs ability database validation in summary mode.
- `npm run validate:abilities:report`: Runs ability database validation and saves detailed output to `abilities_report.txt`.
- `npm run validate:moves`: Semi-integrity validation for moves database against Showdown Dex.
- `npm run validate:moves:summary`: Runs move database validation in summary mode.
- `npm run validate:moves:report`: Runs move database validation and saves detailed output to `moves_report.txt`.
- `npm run validate:sandbox`: Validation for moves tooltip render in the battle sandbox.
- `npm run validate:sandbox:summary`: Runs sandbox validation in summary mode.
- `npm run validate:sandbox:report`: Runs sandbox validation and saves detailed output to `sandbox_report.txt`.
- `npm run audit`: Unified standards scan (Viewports, GPU, SASS filters).
- `npm run audit:fix`: Automatic standards repair (Node prefixes, Viewports).
- `npm run audit:summary`: Runs project audit in summary mode.
- `npm run audit:report`: Runs project audit and saves detailed output to `audit_report.txt`.
- `npm run audit:full`: **THE GOLD STANDARD**. Total audit (Code + FSM + Items + SQL + Abilities + Moves). MANDATORY before any commit.
- `npm run lint`: Style and syntax verification (includes type-check).
- `npm run lint:report`: Runs ESLint with cache enabled and saves a codeframe report in `scratch/lint_report.txt`.
- `npm run test:node`: Runs the pure logic test suite using the native Node.js 26+ test runner.
- `npm run test:all`: Sequentially runs the native Node.js tests (`test:node`) and the component tests in Vitest (`test`).
- `npm run test:e2e`: Runs E2E browser and UI synchronization tests using Playwright.
- `npm run test:e2e:battle`: Runs only the battle-related E2E tests (FSM sync, held items, weather).
- `npm run test:e2e:gts`: Runs only the GTS transactions E2E tests.
- `npm run test:e2e:save`: Runs only the Save Shield E2E tests.
- `npm run test:e2e:breeding`: Runs only the breeding and hatching E2E tests.
- `npm run test:e2e:missions`: Runs only the daily daycare missions E2E tests.
- `npm run test:e2e:gyms`: Runs only the gym progression E2E tests.
- `npm run test:combat:all`: Runs the entire combat test suite, including fuzzer coverages, sync tests, unit tests, and Playwright E2E browser tests in parallel.
- `npm run test:combat:fuzzer`: Runs the move and ability coverage fuzzer in Vitest.
- `npm run test:combat:fuzzer:report`: Runs the fuzzer test and saves the verbose report in `scratch/fuzzer_report.txt`.
- `npm run test:combat:items`: Runs the item coverage fuzzer in Vitest.
- `npm run test:combat:items:report`: Runs the items fuzzer test and saves the verbose report in `scratch/items_coverage_report.txt`.
- `npm run test:combat:e2e-fsm`: Runs only the Playwright E2E battle FSM sync test suite.
  - *Tip*: You can run a single specific battle by its unique hash ID using the `TEST_CASE_ID` environment variable: `$env:TEST_CASE_ID="case-8b5b9aabf776"; npm run test:combat:e2e-fsm`
  - *Tip*: To skip already verified cases during debugging, you can start execution *from* a specific case ID or index: `$env:TEST_START_FROM_CASE_ID="case-8b5b9aabf776"; npm run test:combat:e2e-fsm` (or use `$env:TEST_START_FROM_INDEX="15"`)
- `npm run test:combat:e2e-fsm:report`: Runs the Playwright E2E FSM tests and saves the output in `scratch/e2e_fsm_report.txt`.
- `npm run test:combat:cleanup`: Runs the unit test suite verifying volatile status and stat stage resets on switch.
- `npm run test:combat:cleanup:report`: Runs the cleanup test and saves the verbose report in `scratch/cleanup_report.txt`.
- `npm run test:combat:weather`: Runs the unit test suite verifying weather and terrain effects on speed and status.
- `npm run test:combat:weather:report`: Runs the weather test and saves the verbose report in `scratch/weather_report.txt`.
- `npm run test:combat:choice`: Runs the unit test suite verifying Choice item locking and UI disabling behavior.
- `npm run test:combat:choice:report`: Runs the choice test and saves the verbose report in `scratch/choice_report.txt`.
- `npm run test:combat:all:report`: Runs the entire combat suite and outputs reports to `scratch/combat_report.txt` and `scratch/playwright_report.txt`.
- `npm run migrations:generate`: Scans local SQL migration files under `database/migrations/` and packages them into the production TypeScript migrations manifest.
- `npm run sync:test`: **Test Repo Sync**. Copies the full source tree to sibling `pokevicio-test` repository.

### ⚔️ Battle Engine (FSM Mastery)

- `npm run validate:fsm:diagrams`: 1:1 parity verifier between code and Mermaid diagrams.
- `npm run validate:fsm:implementation`: Deep audit of FSM architectural layers.
- `npm run validate:fsm:flow`: State sequence verifier and race condition detection.
- `npm run validate:fsm`: Unified FSM Mastery Audit (Diagrams + Implementation + Flow).
- `npm run validate:fsm:summary`: Runs FSM validation in summary mode.
- `npm run validate:fsm:report`: Runs FSM validation and saves detailed output to `fsm_report.txt`.

### ☁️ Supabase Infrastructure & Multi-Server Management

- `npm run supabase:manage <command>`: Main Supabase CLI orchestrator in Node.js 26+ (`supabase/setup_supabase.ts`). Manages the Docker container lifecycle.
  - Subcommands: `all`, `clone`, `generate`, `build`, `publish`, `add`.
- `npm run servers:configure`: Parses unified master `.env` file, extracts profiles, and automatically generates `src/data/official_servers.ts`.
- `npm run servers:db:update`: Supabase database manager and migrator in Node.js 26+.
- `npm run servers:db:backup`: Connects to chosen Supabase server and downloads complete structured backup to `database/backups/`.
- `npm run servers:db:restore`: Transactionally restores a JSON backup file to the chosen server.
- `npm run servers:db:local-import`: Imports the most recent JSON backup from a chosen Supabase server into the local SQLite database.
- `npm run servers:db:admin`: Supabase user admin CLI in Node.js 26+ (unban, update passwords, promote, etc.).
- `npm run admin:rename`: Administrative CLI to rename a trainer directly in the database.

### 🖼️ Assets

- `npm run assets:convert`: Unified pipeline for WebP conversion and mirroring.
- `npm run assets:download`: External sprite downloader (PokeAPI/Showdown).

---

## 🛠️ E2E Debugging & Bug Fixing Protocol

When diagnosing or fixing failures in the E2E simulation suites, follow this structured, zero-waste workflow:

1. **Run the E2E Suite**: Execute the tests using the appropriate script:
   ```powershell
   npm run test:e2e:battle
   ```
2. **Identify and Isolate the Failure**: If a test fails, the runner will abort immediately and output the exact case hash in the console (e.g., `case-8b5b9aabf776`).
3. **Debug the Specific Case**: Set the `TEST_CASE_ID` environment variable to run **ONLY** that failing case for near-instant loop times:
   ```powershell
   $env:TEST_CASE_ID="case-8b5b9aabf776"; npm run test:combat:e2e-fsm
   ```
   Apply fixes to the source code and re-run this command until the case passes in green.
4. **Resume Remaining Cases**: Resume the remaining simulation queue starting *from* the resolved case onwards using `TEST_START_FROM_CASE_ID`:
   ```powershell
   $env:TEST_START_FROM_CASE_ID="case-8b5b9aabf776"; npm run test:combat:e2e-fsm
   ```
   Repeat this loop for any subsequent failures.
5. **Final Regression Pass**: Once the queue finishes completely, clear the environment variables and run a full, clean verification of the E2E suite to guarantee no regressions were introduced.
