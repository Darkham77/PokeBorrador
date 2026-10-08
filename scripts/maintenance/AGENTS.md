# Purpose

Domain boundary and module implementation for maintenance. Defines architectural responsibilities and subsystem logic.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Maintenance Scripts Governance

General system maintenance scripts, import fixes, server configurations, and development plugins.

### Core Rules & Audit Guidelines

- **Audit Orchestrator & Gatekeeper Framework**: The unified audit orchestrator (`auditor` / `npm run auditor`) is provided by `@francogp/auditor`. It executes all 48 built-in suites and 18 host extensions declared in `audit.config.ts`, enforcing 0 errors and the baseline warning ratchet.
- **Administrative CLI Contracts**: Maintenance scripts MUST implement `node:util parseArgs` with explicit typed options and provide `--help`:
  - `admin_supabase_users.ts` (`npm run database:admin server=<profile> action=<action> email=<email> [password=<pass> | new-email=<email> | username=<name>]`)
  - `admin_rename.ts` (`npm run admin:rename user=<id_or_name> name=<new_name>`)
  - `repair_account_legality.ts` (`npm run database:repair-account [server=<profile>] [user=<id_or_email>] [all] [fix]`)
  - `diagnose_account.ts` (`npm run database:diagnose-account [server=<profile>] [file=<backup_json>] [db=<sqlite_path>] user=<id_or_email_or_name> [save-json=<path>]` / `npm run database:diagnose-accounts [server=<profile>] [file=<backup_json>] [db=<sqlite_path>]`)
- **Static Asset Pre-Compression & Reporting (`vite-plugin-precompress.ts`)**: The build precompression plugin generates `.br` (Brotli Q11) and `.gz` (Gzip L9) assets natively in `dist/` using asynchronous multithreaded `libuv` compression with a concurrent worker pool (`CONCURRENCY_LIMIT = 8`). Upon bundle completion (`closeBundle`), it outputs a consolidated Unicode Box-Drawing summary table reporting individual and total sizes across categories (Workers, WASM, App Shell, etc.), with automatic warning badges (`⚠️`) for assets approaching the 8 MB PWA Workbox limit.
- **Dev Shadow Editor API Resilience (`vite-plugin-dev-shadow-editor.ts`)**: The dev shadow editor endpoints (`dev-load-shadow-overrides`, `dev-save-shadow-overrides`) MUST enforce strict unwrapping of candidate override records and strip non-override metadata (`globalShadowConfig`, `overrides`) before writing to disk, guaranteeing flat dictionary structures.
- **Zero-Dependency Native Stdlib in Lifecycle Scripts Mandate (`preinstall`, `check_environment.ts`)**: Any maintenance script registered in `package.json` lifecycle hooks that run before or during dependency installation (e.g. `"preinstall"`, `"postinstall"`, `"prepare"`) MUST strictly and exclusively use native Node.js core modules (`node:fs`, `node:path`, `node:process`, `node:util`). They MUST NEVER import internal tooling libraries from `scripts/lib/` or application code from `src/` that could transitively pull dependencies from `node_modules`. They MUST be 100% self-contained so that execution succeeds on fresh, clean CI runners (such as GitHub Actions / GitHub Pages) before `node_modules` is populated by `npm ci` or `npm install`.
- **NPM 12 Lifecycle Scripts Whitelisting (`allowScripts`) & Binary Symlinking**: Under Node.js 26+ with npm 12+, dependency install/lifecycle scripts (`install`, `postinstall`, `build`) are blocked by default for security unless explicitly declared in `package.json` under `"allowScripts"`. All approved native build dependencies (`@parcel/watcher`, `esbuild`) MUST be declared in `"allowScripts"`, and build tool packages not directly imported in code must be registered in `.fallowrc.json`'s `ignoreDependencies`. Environment initialization scripts (`setup-linux.sh`, `setup-windows.ps1`) MUST automatically synchronize native binaries into `~/.local/bin` alongside `node`, `npm`, `npx` so CLI tools are immediately available in the user's path without requiring terminal restarts.
- **Decoupled Server Catalog Generation (`configure_official_servers.ts`)**: Maintenance scripts generating server configurations MUST output exclusively to gitignored `src/data/system/servers.local.json` in pure JSON. Mutating tracked TypeScript files (`official_servers.ts`) is strictly forbidden to prevent Git working tree pollution during automated deployment or local initialization. It is executed automatically as part of `npm run dev`, environment setup scripts (`setup-linux.sh`, `setup-windows.ps1`), and CI deployment workflows to compile active server profiles from `.env` or `process.env`.
- **Idempotent Version Governance & Non-Destructive Setup (`setup-linux.sh`, `setup-windows.ps1`)**: Setup and environment preparation scripts by default in developer workstations query `nodejs.org` for the latest Current stable Node.js release, synchronize `.nvmrc` and `package.json`, update `npm@latest` globally in that isolated Node version, and execute `npm ci`. In automated deployment, CI pipelines, or server environments, passing `--declared-versions` / `-DeclaredVersions` (aliases `--locked`, `--pinned`) strictly freezes the installation to the versions declared in the commit (`.nvmrc` / `package.json`) without network queries, without mutating Git-tracked files, and without updating npm. Setup scripts MUST NEVER automatically delete or uninstall pre-existing Node versions in NVM belonging to other projects; pruning is strictly restricted to explicit `--prune-other-versions` / `-PruneOtherVersions` flags. Furthermore, setup scripts MUST NOT mutate global user configuration (`~/.npmrc`) or clear system-wide caches; all project-specific npm security policies (`ignore-scripts=true`, `audit-level=high`) MUST be scoped exclusively to the local repository `.npmrc`.
- **Reverse Proxy WebSocket HMR Auto-Configuration (`vite.config.ts`)**: Development server configuration MUST detect reverse-proxy environments (`DEPLOY_SERVER_NAME`, `VITE_HMR_PORT`, `VITE_REVERSE_PROXY=true`) and automatically configure `hmr: { protocol: 'wss', clientPort: 443 }` and `allowedHosts: true`. This prevents WebSocket connection drops when accessing the Vite dev server over HTTPS through an external SSL-terminating reverse proxy (Nginx, Apache).

## Key Files

- [`configure_official_servers.ts`](./configure_official_servers.ts): Synchronizes the official servers catalog by generating unversioned `src/data/system/servers.local.json` from the master `.env` file.
- [`admin_supabase_users.ts`](./admin_supabase_users.ts): Administrative CLI utility for Supabase user management.
- [`admin_rename.ts`](./admin_rename.ts): Administrative CLI tool for player renaming.
- [`repair_account_legality.ts`](./repair_account_legality.ts): Database maintenance script repairing account legality.
- [`diagnose_account.ts`](./diagnose_account.ts): Database maintenance script for account diagnostics.
- [`vite-plugin-precompress.ts`](./vite-plugin-precompress.ts): Static asset precompression plugin for Brotli and Gzip.
- [`vite-plugin-dev-shadow-editor.ts`](./vite-plugin-dev-shadow-editor.ts): Dev shadow editor middleware plugin.
- [`vite-plugin-lan-pvp.ts`](./vite-plugin-lan-pvp.ts): LAN PvP dev server middleware plugin.
- [`vite-plugin-sass-traps.ts`](./vite-plugin-sass-traps.ts): SCSS traps fixer plugin.
- [`vite-plugin-fix-pkmn-sim.ts`](./vite-plugin-fix-pkmn-sim.ts): Shared Vite plugin patching Pokemon Showdown static import syntax.

- `audit_bundle_chunks.ts`: Module implementation.
- `fix_node_timers_imports.ts`: Module implementation.
- `fix_vue_imports.ts`: Module implementation.
- `fix_vue_inline_imports.ts`: Module implementation.
- `migrate_temporal.ts`: Module implementation.
- `parse_lint.ts`: Module implementation.
- `sync_to_test.ts`: Module implementation.
- [`check_environment.ts`](./check_environment.ts): Module implementation.
- [`migrate_dox_sections.ts`](./migrate_dox_sections.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- [audit_showdown/AGENTS.md](./audit_showdown/AGENTS.md): Showdown simulation parity audit runner.
