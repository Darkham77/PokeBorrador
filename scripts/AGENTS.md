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

## Work Guidance

- Use `node --experimental-strip-types` paired with Node.js 26+ sandboxed permissions flags (`--permission`) instead of using `tsx` or `ts-node` (which are forbidden).
- Mandate built-in modules prefix (e.g., `node:fs`).
- Exclude the raw assets folders from file watchers in `vite.config.ts` to prevent locking crashes under Windows.
- Save validation/audit outputs and temporary reports strictly inside the root `scratch/` folder.
- All validation and audit scripts support standard flags: `--errors-only` to filter out warnings and focus on errors, and `--summary` (or `-s`) to present structured counts instead of detailed lists.
- **Workflow Roles for Verification**: Use `npm run lint` (~3-5s fast feedback) for rapid iterative verification during active development. Use `npm run audit:warnings-diff` as the single source of truth pre-commit gatekeeper to enforce 0 project errors and 0 new warnings vs `origin/main`.
- **Mandatory Tooling & Script Caching**: All maintenance, validation, and migration scripts in `scripts/` MUST invoke `enableCompileCache()` from `node:module` at startup. All ESLint commands in `package.json` and internal script subprocesses MUST pass the `--cache` flag. TypeScript compilation configs MUST keep `incremental: true` enabled.
- **Prohibition of Redundant / Duplicate Analysis Passes**: When orchestrating audits (e.g. `audit_warnings_diff.ts`), do NOT execute sub-analyzers (such as Fallow Dupes/Security or CSS checkers) separately if they are already executed internally by `audit_project.ts`. Every analyzer must run exactly once per audit pipeline.
- **Audit Dual-Mode & JSON-First Architecture**: Audit scripts MUST output 100% parseable structured JSON to `stdout` by default, routing all interactive progress logging to `stderr`. The `--human` (or `-H`) flag is reserved for interactive developer-friendly console outputs. Multi-format export (`--output`) MUST support `.json`, `.md` (Markdown tables), and `.txt`.
- **Audit Exemptions**: Utility, maintenance, and migration scripts in `scripts/` are exempt from legacy code audits (like legacyDates) to allow historical or support tasks without warnings.
- **Web Worker URL Integrity**: When moving files containing worker URL patterns (`new URL('./relative', import.meta.url)`), update paths to prevent `UNRESOLVED_ENTRY` build errors. Always check for `import.meta.url`.
- **Node.js Permission Model Compliance**: Scripts must explicitly request narrow permissions (e.g. `--allow-net`, `--allow-fs`). Running coverage (`--experimental-test-coverage`) under permissions requires explicit write permissions (`--allow-fs-write=*` or to specific directories) as report files are generated on disk.
- **Fallow Auditing**: Local dynamic HTTP fetch requests that trigger CWE-918 (security-sink) must be marked with `// fallow-ignore-file security-sink` at the top of the file. Parser scripts for Fallow must map the JSON structure (`file` and `start_line` properties instead of `path` and `line`). Static databases (like `pokemonDB.ts`) are exempt from duplication detectors and must be listed under `ignorePatterns` in `.fallowrc.json`.
- **Cross-Platform Path Standard**: For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of expressions or replace statements.
- **No Vitest Coupling in Logic Scripts**: Headless logic simulation fuzzers inside `scripts/e2e/fuzzer/` must NOT import `describe`, `it`, `expect`, or any other test runner primitives. They must run natively under Node.js 26+ using the modern Permission Model (`--permission`) to request FS access, completely decoupled from testing frameworks (Vitest/Playwright).
- **Simulation and Fuzzer Naming Standards**: All script files inside `scripts/` MUST use snake_case (`_`) as their filename delimiter. Browser-based scenario simulations running under Playwright MUST use the `.sim.ts` extension instead of `.spec.ts` or `.test.ts`.
- **Simulation Results Isolation**: All simulation logs, failure files, and certified test fixtures MUST be stored inside `scripts/e2e/results/`.
- **CSS Audit Performance & Subprocess Control**: When auditing SCSS files or Vue `<style>` blocks with external AST analyzers like `css-checker-kit`, aggregate extracted style code into domain bundle files (`bundle_styles.css`, `bundle_components.css`, `bundle_views.css`) before passing them to the analyzer binary to eliminate file handle I/O and $O(N^2)$ cross-file AST overhead. All child process calls (`execSync`, `spawnSync`) running external binaries MUST set explicit execution timeouts (e.g. `timeout: 15000`) and hard termination signals (`killSignal: 'SIGKILL'`) to prevent orphaned background processes and CPU saturation.
- **Item Effect Active Verification & IPB Deactivation Lifecycle**: Item fuzzers MUST actively verify that the held item's effect triggered and applied (`itemCoverage[id].status = 'PASSED'`). IPB cheat maintenance (PP/HP refilling) is strictly permitted ONLY while test objectives are active (`movesToTest.size > 0`). As soon as item objectives complete, `ipbActive` MUST automatically turn off (`false`) so PP depletes naturally, `Struggle` activates upon PP exhaustion, and the battle completes organically to its end without infinite cheat loops.

## Verification

- Execute scripts natively to verify they pass sandboxed permission audits.

## Reference Manuals

- [dependency_management_manual.md](../.agents/skills/project-standards/references/technical/dependency_management_manual.md): Node.js 26+ native standards.
- [asset_service_manual.md](../.agents/skills/project-standards/references/technical/asset_service_manual.md): Image assets pipeline rules.
- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Command reference for quality scripts.

## Child DOX Index

- [assets/](./assets/AGENTS.md): Domain module documentation for assets.
- [database/](./database/AGENTS.md): Domain module documentation for database.
- [e2e/](./e2e/AGENTS.md): Domain module documentation for e2e.
- [maintenance/](./maintenance/AGENTS.md): Domain module documentation for maintenance.
- [tools/](./tools/AGENTS.md): Domain module documentation for tools.
- [validation/](./validation/AGENTS.md): Domain module documentation for validation.
