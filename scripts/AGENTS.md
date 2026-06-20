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

## Verification

- Execute scripts natively to verify they pass sandboxed permission audits.

## Child DOX Index

- [assets/](./assets/): Conversion, optimization, downloading, and consistency auditing of sprites and images.
- [database/](./database/): Database schemas backup, restoration, migrations compilation, and seeding.
- [maintenance/](./maintenance/): Code quality audit pipelines, local server configurators, temporal migrations, and HMR traps.
- [validation/](./validation/): Integrity validators for combat FSMs, ability learnsets, translation sheets, and game rules.
