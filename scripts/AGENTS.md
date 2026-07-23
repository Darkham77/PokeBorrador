# Purpose

Automation, build processes, diagnostic tools, and utility scripts for the Poké Vicio project.

## Ownership

DevOps / Tooling Engineers.

## Local Contracts

- Strict compliance with Node.js 26+ native execution standards.
- Windows file locking handling (EBUSY errors).

## Work Guidance

- Use `node --experimental-strip-types` paired with Node.js 26+ sandboxed permissions flags (`--permission`) instead of using `tsx` or `ts-node` (which are forbidden).
- Mandate built-in modules prefix (e.g., `node:fs`).
- Exclude the raw assets folders from file watchers in `vite.config.ts` to prevent locking crashes under Windows.
- Save validation/audit outputs and temporary reports strictly inside the root `scratch/` folder.
- All validation and audit scripts support standard flags: `--errors-only` to filter out warnings and focus on errors, and `--summary` (or `-s`) to present structured counts instead of detailed lists.
- **Audit Exemptions**: Utility, maintenance, and migration scripts in `scripts/` are exempt from legacy code audits (like legacyDates) to allow historical or support tasks without warnings.
- **Web Worker URL Integrity**: When moving files containing worker URL patterns (`new URL('./relative', import.meta.url)`), update paths to prevent `UNRESOLVED_ENTRY` build errors. Always check for `import.meta.url`.
- **Node.js Permission Model Compliance**: Scripts must explicitly request narrow permissions (e.g. `--allow-net`, `--allow-fs`). Running coverage (`--experimental-test-coverage`) under permissions requires explicit write permissions (`--allow-fs-write=*` or to specific directories) as report files are generated on disk.
- **Fallow Auditing**: Local dynamic HTTP fetch requests that trigger CWE-918 (security-sink) must be marked with `// fallow-ignore-file security-sink` at the top of the file. Parser scripts for Fallow must map the JSON structure (`file` and `start_line` properties instead of `path` and `line`). Static databases (like `pokemonDB.ts`) are exempt from duplication detectors and must be listed under `ignorePatterns` in `.fallowrc.json`.
- **Cross-Platform Path Standard**: For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of expressions or replace statements.
- **No Vitest Coupling in Logic Scripts**: Headless logic simulation fuzzers inside `scripts/e2e/fuzzer/` must NOT import `describe`, `it`, `expect`, or any other test runner primitives. They must run natively under Node.js 26+ using the modern Permission Model (`--permission`) to request FS access, completely decoupled from testing frameworks (Vitest/Playwright).
- **Simulation and Fuzzer Naming Standards**: All script files inside `scripts/` MUST use snake_case (`_`) as their filename delimiter. Browser-based scenario simulations running under Playwright MUST use the `.sim.ts` extension instead of `.spec.ts` or `.test.ts`.
- **Simulation Results Isolation**: All simulation logs, failure files, and certified test fixtures MUST be stored inside `scripts/e2e/results/`.
- **CSS Audit Performance & Subprocess Control**: When auditing SCSS files or Vue `<style>` blocks with external AST analyzers like `css-checker-kit`, aggregate extracted style code into domain bundle files (`bundle_styles.css`, `bundle_components.css`, `bundle_views.css`) before passing them to the analyzer binary to eliminate file handle I/O and $O(N^2)$ cross-file AST overhead. All child process calls (`execSync`, `spawnSync`) running external binaries MUST set explicit execution timeouts (e.g. `timeout: 15000`) and hard termination signals (`killSignal: 'SIGKILL'`) to prevent orphaned background processes and CPU saturation.

## Verification

- Execute scripts natively to verify they pass sandboxed permission audits.

## Reference Manuals

- [dependency_management_manual.md](../.agents/skills/project-standards/references/technical/dependency_management_manual.md): Node.js 26+ native standards.
- [asset_service_manual.md](../.agents/skills/project-standards/references/technical/asset_service_manual.md): Image assets pipeline rules.
- [validation_manual.md](../.agents/skills/project-standards/references/qa/validation_manual.md): Command reference for quality scripts.

## Child DOX Index

- [assets/](./assets/): Conversion, optimization, downloading, and consistency auditing of sprites and images.
- [database/](./database/): Database schemas backup, restoration, migrations compilation, and seeding.
- [e2e/](./e2e/AGENTS.md): Playwright-based scenario simulations and test case builders.
- [maintenance/](./maintenance/): Code quality audit pipelines, local server configurators, temporal migrations, and HMR traps.
- [validation/](./validation/): Integrity validators for combat FSMs, ability learnsets, translation sheets, and game rules.
