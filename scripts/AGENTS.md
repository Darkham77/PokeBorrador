# Purpose

Automation, build processes, diagnostic tools, and utility scripts for the Poké Vicio project.

## Ownership

DevOps / Tooling Engineers.

## Local Contracts

- Strict compliance with Node.js 26+ native execution standards.
- Windows file locking handling (EBUSY errors).
- **Showdown UID Mapping Parity**: All fuzzer engines, replayers, and simulation scripts MUST consume and persist canonical Showdown UID mappings (`p1ActiveUid`, `p2ActiveUid`, `showdownUidMapper.ts`). Resolving Pokémon by species names, nicknames, or hardcoded slot indices is strictly prohibited.
- **Exact Fainted State Synchronization Across Bench and Field Combatants**: Fuzzer engines, replayers, and test drivers MUST faithfully verify exact fainted state synchronization (`0 fnt`, `reviving: true`) across both active field combatants and bench party members, ensuring faint processing runs completely before switch menus are opened.
- **Event-Driven Joystick Transitions & Zero-Timer Parity**: Automation scripts and E2E scenario drivers MUST synchronize exclusively via public typed application events (`battle-ready-for-input`, `battle-forced-switch-required`) and GSAP timelines with 100% zero-timer synchronization. Using arbitrary delays (`sleep`, `setTimeout`, `page.waitForTimeout`) is strictly forbidden.
- **Zero Runtime Fallbacks Policy**: Scripts, fuzzers, and replayers MUST NOT introduce fallback choices, dummy derivations, or swallowed errors (`.catch(() => true)`). Any missing data or state divergence must fail loudly and immediately.
- **Deterministic Simulation Timeout Standards**: All Playwright simulation wrappers and UI interactions enforce a strict 5-second per-action limit (`MAX_PER_ACTION_TIMEOUT_MS = 5000`). Suite-level total timeouts are configured strictly by parameter via `getSuiteTimeoutForBatch(turnCount)`, scaling with fuzzer turn volume (`turnCount * MAX_PER_ACTION_TIMEOUT_MS`) when turn history is present, and defaulting to `MAX_SUITE_TOTAL_TIMEOUT_MS = 180000` (3 minutes statically) when no fuzzer turns exist. Arbitrary runtime multipliers or dynamic guessing during execution are strictly forbidden.
- **NPM Package.json SSoT Mandate**: All maintenance tools, validators, analyzers, and simulation runners MUST expose an official script in `package.json` and be invoked exclusively via `npm run <script>` across all documentation, skills, and DOX indices. Documenting or running raw unindexed script paths (e.g. `node scripts/...` or `npx tsx scripts/...`) is strictly prohibited. If a new maintenance script is added, it MUST be registered in `package.json`.
- **Explicit Named Flags Mandate for CLI Scripts**: All scripts in `scripts/` and `supabase/` that accept runtime arguments MUST implement `node:util parseArgs` with explicit typed options (`server`, `action`, `email`, `password`, `file`, `all`, etc.) and provide comprehensive `--help` support. Invocations via npm MUST use the canonical format `npm run <script> key=value` (or `npm run <script> flag`, e.g. `npm run servers:db:update server=server_franco`, `npm run servers:db:backup all`). Positional "magic arguments" without clear names are strictly forbidden.
- **Autonomous Help Handler**: `--help` flags MUST be processed immediately upon argument parsing, before checking database connections, environment variable definitions, or network access, allowing developers to inspect command documentation safely and offline.
- **Windows Environment & Native Tooling Resilience**: Setup and initialization scripts (`setup-windows.ps1`, `setup-linux.sh`) MUST preserve system `PATH` by additively concatenating `Machine` and `User` paths, never overwriting `Machine` paths to prevent losing `C:\Windows\System32` and native utilities (such as `chcp`). Setup scripts on Windows MUST apply Defender exclusions (`Add-MpPreference`), recursively unblock native binary extensions (`.node`, `.dll`, `.exe`) in `node_modules` (`Unblock-File`), and invoke `npm run validate:tools` immediately after `npm ci`.

## Work Guidance

- Use `node --experimental-strip-types` paired with Node.js 26+ sandboxed permissions flags (`--permission`) instead of using `tsx` or `ts-node` (which are forbidden).
- Mandate built-in modules prefix (e.g., `node:fs`).
- Exclude the raw assets folders from file watchers in `vite.config.ts` to prevent locking crashes under Windows.
- Individual sub-validators support `--errors-only` to filter out warnings and focus on errors. The unified audit runner (`npm run audit`) displays the summary table in the console and automatically writes complete JSON to `scratch/audits/latest_audit.json`.
- **Workflow Roles for Verification**: Use `npm run lint` (~3-5s fast feedback) for rapid iterative verification during active development. Use `npm run audit:warnings-diff` as the single source of truth pre-commit gatekeeper to enforce 0 project errors and 0 new warnings vs `origin/main`.
- **Mandatory Tooling & Script Caching**: All maintenance, validation, and migration scripts in `scripts/` MUST invoke `enableCompileCache()` from `node:module` at startup. All ESLint commands in `package.json` and internal script subprocesses MUST pass the `--cache` flag. TypeScript compilation configs MUST keep `incremental: true` enabled.
- **Prohibition of Redundant / Duplicate Analysis Passes**: When orchestrating audits (e.g. `audit_warnings_diff.ts`), do NOT execute sub-analyzers (such as Fallow Dupes/Security or CSS checkers) separately if they are already executed internally by `audit_project.ts`. Every analyzer must run exactly once per audit pipeline.
- **Universal Audit Behavior (Console Summary + JSON in Scratch)**: All quality and verification tools reside under `scripts/auditors/<family>/`. They MUST implement the `StandardAuditResult` contract and execute under the universal standard: terminal output is always the clean human summary table, and full machine-readable structured JSON is automatically saved to `scratch/audits/latest_audit.json` (and `scratch/audits/<family>/<id>.json`).
- **Audit Exemptions**: Utility, maintenance, and migration scripts in `scripts/` are exempt from legacy code audits (like legacyDates) to allow historical or support tasks without warnings.
- **Web Worker URL Integrity**: When moving files containing worker URL patterns (`new URL('./relative', import.meta.url)`), update paths to prevent `UNRESOLVED_ENTRY` build errors. Always check for `import.meta.url`.
- **Node.js Permission Model Compliance**: Scripts must explicitly request narrow permissions (e.g. `--allow-net`, `--allow-fs`). Running coverage (`--experimental-test-coverage`) under permissions requires explicit write permissions (`--allow-fs-write=*` or to specific directories) as report files are generated on disk.
- **Fallow Auditing**: Local dynamic HTTP fetch requests that trigger CWE-918 (security-sink) must be marked with `// fallow-ignore-file security-sink` at the top of the file. Parser scripts for Fallow must map the JSON structure (`file` and `start_line` properties instead of `path` and `line`). Static databases (like `pokemonDB.ts`) are exempt from duplication detectors and must be listed under `ignorePatterns` in `.fallowrc.json`.
- **Cross-Platform Path Standard**: For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of expressions or replace statements.
- **No Vitest Coupling in Logic Scripts**: Headless logic simulation fuzzers inside `scripts/e2e/fuzzer/` must NOT import `describe`, `it`, `expect`, or any other test runner primitives. They must run natively under Node.js 26+ using the modern Permission Model (`--permission`) to request FS access, completely decoupled from testing frameworks (Vitest/Playwright).
- **Simulation and Fuzzer Naming Standards**: All script files inside `scripts/` MUST use snake_case (`_`) as their filename delimiter. Browser-based scenario simulations running under Playwright MUST use the `.sim.ts` extension instead of `.spec.ts` or `.test.ts`.
- **Simulation Results Isolation**: All simulation logs, failure files, and certified test fixtures MUST be stored inside `scripts/e2e/results/`.
- **CSS Audit Performance & Subprocess Control**: When auditing SCSS files or Vue `<style>` blocks with external AST analyzers like `css-checker-kit`, aggregate extracted style code into domain bundle files (`bundle_styles.css`, `bundle_components.css`, `bundle_views.css`) before passing them to the analyzer binary to eliminate file handle I/O and $O(N^2)$ cross-file AST overhead. All child process calls (`execSync`, `spawnSync`) running external binaries MUST set explicit execution timeouts (e.g. `timeout: 15000`) and hard termination signals (`killSignal: 'SIGKILL'`) to prevent orphaned background processes and CPU saturation.
- **Vue 3 SFC Linting Architecture & Type Separation**: Type checking across all 260+ Vue Single File Components and TypeScript modules is strictly enforced by `npm run validate:types` (`vue-tsc --noEmit`), which compiles the entire codebase in parallel in ~5s. ESLint must focus exclusively on syntactic validation, zero-any checks (`@typescript-eslint/no-explicit-any`), anti-bypass rules (`@typescript-eslint/ban-ts-comment`, `no-restricted-syntax`), and Vue template/security auditing without attaching memory-heavy `projectService` virtual compilers.
- **Fast Linting Pipeline Runtime**: `npm run lint` leverages cached ESLint, fast type checking (`vue-tsc`), and markdownlint to achieve sub-10s turnaround times during developer iteration.
- **Dynamic Selective Rule Execution & Descriptor Contracts**: All auditors, analyzers, and regex rules MUST declare their parameters and metadata dynamically via `RuleDescriptor` (`id`, `name`, `category`, `aliases`). Hardcoding rule names, string arrays, or analyzer lists in runners is strictly forbidden. When a specific rule or set of rules is requested (`rule=DOX`, `rule=DOX,z-index`, `rule=dupes`), the audit engine must short-circuit and run ONLY the matching sub-analyzers and rules, skipping unrequested suites (such as Fallow, CSS checker, or file scans) for sub-second developer execution.

## Verification

- Execute scripts natively to verify they pass sandboxed permission audits.

## Reference Manuals

- [dependency_management_manual.md](../.agents/skills/project-standards/references/technical/dependency_management_manual.md): Node.js 26+ native standards.
- [asset_service_manual.md](../.agents/skills/project-standards/references/technical/asset_service_manual.md): Image assets pipeline rules.
- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Command reference for quality scripts.

## Child DOX Index

- [assets/](./assets/AGENTS.md): Domain module documentation for assets.
- [data/](./data/AGENTS.md): Data generation and database synchronization utility scripts.
- [database/](./database/AGENTS.md): Domain module documentation for database.
- [e2e/](./e2e/AGENTS.md): Domain module documentation for e2e.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [auditors/](./auditors/AGENTS.md): Domain module documentation for auditors and validators.
- [tools/](./tools/AGENTS.md): Domain module documentation for tools.
