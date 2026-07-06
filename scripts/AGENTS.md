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
- **No Vitest Coupling in Logic Scripts**: Scripts in `scripts/battle-tester/` must NOT import `describe`, `it`, `expect`, or any other test runner primitives. Logic scripts export pure async functions returning structured data. The test runner coupling lives exclusively in spec files under `tests/`. This keeps logic scripts independently runnable and composable.

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
