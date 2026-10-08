# Poké Vicio — Retro-Modern Pokémon Web Game

Poké Vicio is a hybrid retro-modern web video game built with **Vue 3**, **Pinia**, **GSAP**, the canonical Pokémon Showdown combat engine (`@pkmn/sim`), dual persistence (offline local SQLite with OPFS and online Supabase/PostgreSQL), and a modular architecture governed by the decoupled audit suite (`@francogp/auditor`).

## 📋 Prerequisites

- **Runtime**: **Node.js >=26** (supports native `--permission` model, native `node:sqlite`, and `Temporal` API).
- **Package Manager**: **npm >=12**.

> [!IMPORTANT]
> The project leverages modern V8 engine features and strictly enforces versions declared in `package.json` (`engines`) and `.nvmrc`. Running `npm install` or `npm ci` automatically validates the runtime environment via `preinstall` (`check_environment.ts`), aborting with clear actionable instructions if prerequisites are not met.

### 🌐 Environment Setup and Synchronization (Node.js & npm)

To automatically initialize or update your working environment (NVM configuration, `.nvmrc` alignment, isolated npm security policies, cache cleanup, and deterministic installation via `npm ci`), execute the Single Source of Truth (SSoT) script for your operating system:

- **On Windows (PowerShell as Administrator / Terminal)**:

  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1 [-DeclaredVersions]
  ```

- **On Linux / macOS (Terminal)**:

  ```bash
  chmod +x ./setup-linux.sh && ./setup-linux.sh [--declared-versions]
  ```

> [!TIP]
> By default in development workstations, scripts query `nodejs.org`, synchronize `.nvmrc` and `package.json` with the latest Current stable Node.js release, update `npm@latest` globally, and run `npm ci`.
> In CI/CD pipelines, servers, or when you wish to freeze installation strictly to versions declared in the commit without network queries or file mutations, pass `--declared-versions` (Linux/macOS) or `-DeclaredVersions` (Windows).
> Both modes operate non-destructively: they never remove other Node versions on your machine nor overwrite your `default` NVM alias.

## 🛠️ Development Environment

### 🛡️ NPM Security Configuration

Security policies are managed in isolation via `.npmrc` in the project root (without altering global user settings):

```ini
# Poké Vicio - Local Project NPM Configuration
ignore-scripts=true
registry=https://registry.npmjs.org/
audit-level=high
```

>[!NOTE]
> **Note on `ignore-scripts`**: With this setting enabled, legitimate packages that compile native binaries (such as `node-gyp` or profiling tools) may fail during installation. If you trust a specific package and need to run its build scripts, compile it manually using `npm rebuild` or run it once in isolation with `npm run <script> --ignore-scripts=false`.

### 🛡️ Antivirus & Windows Defender Exclusions (Fallow)

The project relies on high-performance native binaries distributed via npm (`fallow` for AST and architectural audits).

Because these native binaries use cryptographic signatures (Ed25519 and SHA-256 digests) rather than commercial Microsoft Authenticode certificates, **Windows Defender** or **Smart App Control** might raise false positive notices when running in the background.

>[!TIP]
> **Developer Recommendation**: Add the project root folder to your antivirus exclusions list:
>
> 1. Open **Windows Security**.
> 2. Navigate to **Virus & threat protection** > **Virus & threat protection settings** (*Manage settings*).
> 3. Under **Exclusions**, select **Add or remove exclusions**.
> 4. Click **Add an exclusion** > **Folder** and select the repository root directory (`PokeBorrador`).

### 🚀 Steps to Start the Local Server

`package-lock.json` is your primary security baseline because it locks cryptographic hashes (integrity SHA-512) for every dependency.

>[!IMPORTANT]
> **Strict Rule**: In development, CI/CD, and production environments, never run bare `npm install` if you want reproducible and safe builds. Always use `npm ci`.

Follow these steps to configure and launch your development environment:

1. **Install dependencies**:

   ```bash
   npm ci
   ```

2. **Configure Environment Variables**: Copy `.env.example` to `.env` and fill in Supabase credentials or server profiles:

   ```bash
   cp .env.example .env
   ```

3. **Synchronize Local Servers**: Generate the decoupled catalog at `src/data/system/servers.local.json`:

   ```bash
   npm run servers:configure
   ```

4. **Start Vite Dev Server**:

   ```bash
   npm run dev
   ```

The application will be available at `https://localhost:5173` (HTTPS / Secure Context).

## 🗄️ Database and Dual Persistence

Poké Vicio implements a **dual persistence** architecture with total isolation governed by `DBRouter`:

- **Online Mode (Supabase / PostgreSQL)**: Authenticated remote connection via `@supabase/supabase-js` with Row Level Security (RLS) and transactional migrations.
- **Offline / Local Mode (SQLite + OPFS)**: Embedded WebAssembly SQLite database running directly in the browser via the *Origin Private File System* (`node:sqlite` / OPFS), enabling 100% offline play without external servers.

### Database Initialization and Updates (Supabase)

All schema migrations are incremental and applied automatically through the centralized migration runner:

```bash
# Initialize or update a specific server profile configured in .env:
npm run database:update server=server_franco

# Update ALL server profiles configured in .env:
npm run database:update all
```

### 💾 Importing Local Database into Browser (Offline Mode / QA)

This workflow enables converting and loading production or staging database backups directly into the developer/tester web browser, running Poké Vicio **100% offline** via WebAssembly SQLite (`node:sqlite` + OPFS - *Origin Private File System*).

#### Purpose

1. **Offline Development**: Work on and test the entire game without depending on remote Supabase instances, Docker containers, or internet connections.
2. **Real Data Debugging**: Reproduce combat, inventory, daycare, or social bugs using exact user game states.
3. **Migration & Sanitization Validation**: Verify that SQL migrations and Showdown Gen 9 legality sanitizers run deterministically before deploying to remote servers.
4. **Instant Multi-Account Access**: Log into any account stored in the backup by username without requiring passwords or email verification.

#### Step-by-Step Flow to Import a Backup into the Browser

```bash
# STEP 1: Download a JSON backup from a Supabase server (Optional if you already have the file)
npm run database:backup server=server_franco

# STEP 2: Upgrade backup and strictly legalize Pokémon / accounts
npm run database:upgrade-backup file=database/backups/server_franco/server_franco_backup_2026-06-27T05-06-25-158315918Z.json

# STEP 3: Convert upgraded JSON to browser SQLite database
npm run database:local-import file=database/backups/server_franco/server_franco_backup_2026-06-27T05-06-25-158315918Z_upgraded.json

# STEP 4: Start Vite dev server
npm run dev
```

#### What Happens Internally During the Process?

1. **`upgrade_backup.ts` (Upgrade & Sanitization)**:
   - Loads backup into an in-memory SQLite database.
   - Applies 100% of official SQL migrations from `database/migrations/`.
   - Runs legality repair (`repairAccountsInSqlite`), fixing illegal or legacy moves according to official Pokémon Showdown Gen 9 formats, recalculating stats, and sanitizing inventories.
   - Outputs the `*_upgraded.json` artifact.

2. **`import_backup_to_sqlite.ts` (Local Mapping & SQLite)**:
   - Maps remote Supabase UUIDs to clean local identifiers (`local_<username>`).
   - Synchronizes and remaps private chats (`chat_messages`), global chats, friendship requests (`friendships`), eggs (`eggs`), daycare, and war tables.
   - Generates the compiled SQLite binary at `scratch/database/manual_user_backup_import.db`.

3. **Vite Dev Server & OPFS Sync (Browser)**:
   - When starting `npm run dev`, Vite exposes `scratch/database/manual_user_backup_import.db` via `/api/dev-manual-import-*`.
   - Navigating to `https://localhost:5173/`, the client engine (`sqliteEngine.ts` / `loadingStore.ts`) detects the manual import, downloads it, and persists it to browser private storage (**OPFS** / `pokevicio_sqlite_v2`).
   - The game launches in offline mode instantly with all accounts, Pokémon, and progress ready for gameplay.

## 🚀 Production Build & Deployment

### 1. Production Build (`npm run build`)

The official production build executes a full assurance pipeline:

1. **Comprehensive Audit**: Runs `npm run auditor` certifying 0 architectural and domain errors.
2. **Bundle Build**: Compiles optimized Vite bundle with Rolldown/ESBuild minification and chunk splitting.
3. **PWA & Service Worker**: Generates offline PWA service worker (`sw.js`).
4. **Static Pre-Compression**: Pre-compresses all static assets to Brotli (`.br`, Q11) and Gzip (`.gz`, L9) via `vite-plugin-precompress.ts`.

```bash
npm run build
```

To inspect chunk size distribution and detect bundle bottlenecks:

```bash
npm run build:analyze
```

Generates an interactive visual treemap at `scratch/bundle_stats.html` and feeds the `npm run auditor:build` suite.

### 2. Hosting Options

- **Web Server / Reverse Proxy (Nginx, Caddy, Apache)**:
  - Serve `dist/` as a static SPA (fallback non-asset routes to `/index.html`).
  - Enable HTTP/2 or HTTP/3 and TLS termination (HTTPS).
  - Configure WebSockets (WSS) proxying for real-time Supabase sync and HMR.
- **Cloud Static Hosting (Cloudflare Pages, Vercel SPA, GitHub Pages)**:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Required environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
- **Self-Hosted Supabase Infrastructure (Docker)**:
  - Poké Vicio includes an automated orchestrator to generate and manage the full 13-microservice Supabase stack in Docker:

    ```bash
    npm run supabase:manage
    ```

  - Consult details in [supabase/README.md](./supabase/README.md) and [SUPABASE-DOCKER-MANUAL.md](./supabase/SUPABASE-DOCKER-MANUAL.md).

## 🏛️ Governance, Quality & Code Integrity

Development in this repository is governed by strict AI rules via Antigravity. These standards are formalized in:

- **[AGENTS.md](./AGENTS.md)**: Master project contract.
- **Skill @/project-standards**: Technical reasoning engine.

Before submitting changes or deploying, code **MUST** pass all quality gates:

1. **Type-checking**: Strict TypeScript type integrity (zero errors permitted).
2. **Linting**: Code must be free of syntax violations and conform to project styling.
3. **Database Validation**: SQL migrations must be tested against local engines before committing.
4. **Testing**: All automated test suites must pass.
5. **Build**: Application must compile cleanly for production.

### 🛡️ Quality, Audit & Integrity (Node.js 26+)

The repository features a unified static/dynamic audit ecosystem, domain validators, and continuous assurance tooling.

#### 🔄 Recommended Verification Flow

- **During Active Development**: Run `npm run lint` (~10 seconds) for fast verification executing 10 core sub-auditors in parallel (`npm run auditor:lint`): domain types, $O(1)$, component styles, Fallow intelligence, Vue SFC hygiene, console cleanliness, audit headers, TypeScript type check (`vue-tsc`), markdownlint, and ESLint.
- **Documentation & DOX Audit**: Run `npm run auditor:md` (~2 seconds) to validate `AGENTS.md` hierarchy, relative links, Markdown syntax, and Markdownlint rules.
- **Safe-Commit Workflow**: The safe-commit pipeline internally uses the warning ratchet in `npm run auditor` against the baseline in `.auditor/audit-baseline.json`.

| Command | Description |
| :-- | :-- |
| `npm run lint` | **Fast Developer Lint**: Runs 10 essential quality suites in parallel via `npm run auditor:lint`. |
| `npm run lint:fix` | **Linter Auto-Fix**: Automatically resolves formatting and syntax issues with ESLint and Markdownlint (`auditor preset=lint fix`). |
| `npm run auditor` | **Unified Global Audit**: Executes 100% of discovered sub-auditors with bounded concurrency, outputs Box-Drawing console tables, and writes structured JSON to `scratch/audits/latest_audit.json`. |
| `npm run auditor:lint` | **Linting Preset**: Executes the parallel 10-suite source code preset. |
| `npm run auditor:md` | **Documentation & DOX Audit**: Fast suite (~2s) validating `AGENTS.md` hierarchy, relative links, Markdown syntax, and Markdownlint rules (preset `md`). |
| `npm run auditor:changed` | **Changed Files Audit**: Runs audit suites exclusively against files modified since `main`. |
| `npm run auditor:fix` | **Architecture Auto-Fix**: Automatically fixes timers, SASS syntax, render layers, and import directives. |
| `npm run auditor:project` | **Architecture & Style Rules**: Evaluates 43 static code rules across `.ts`, `.vue`, and `.scss` files. |
| `npm run auditor:findings` | **Consolidated Findings Report**: Displays Box-Drawing tables of findings grouped by category (`audit:errors`, `audit:warnings`, `audit:summary`, `audit:files`). |
| `npm run auditor:family:domain` | **Domain Audit**: Validates domain types, canonical unions, and $O(1)$ data structures. |
| `npm run auditor:fsm-implementation` | **FSM Audit**: Validates diagrams, dynamic implementation, and battle flow parity. |
| `npm run auditor:family:persistence` | **Persistence Audit**: Validates SQL schemas, migrations, and game save serialization. |
| `npm run auditor:sprites` | **Assets Audit**: Validates sprite collisions, canonical names, and texture atlases. |
| `npm run auditor:family:architecture` | **Architecture Audit**: Validates Fallow modularity, complexity, SCSS tokens, Pinia reactivity, and Vue SFCs. |
| `npm run auditor:fallow` | **Codebase Intelligence (Fallow)**: Consolidated dashboard for metrics, circular dependencies, duplication, orphan exports, and CWE vulnerabilities. |
| `npm run auditor:complexity` | **Complexity Hotspots**: Reports functions with highest cyclomatic and cognitive complexity (`npm run auditor:complexity`). |
| `npm run auditor:stylelint` | **Styles & Classes Audit**: Audits SCSS stylesheets and Vue `<style>` blocks via in-memory Stylelint. |
| `npm run auditor:similar` | **Semantic Discovery**: Detects semantically similar functions or blocks via Fallow AST embeddings. |
| `npm run auditor:review` | **Intelligent Review Brief**: Generates graph-grounded report with blast radius and structural risk for code reviews. |
| `npm run auditor:build` | **Bundle Budget**: Audits production chunk sizes and client decoupling. |
| `npm run build:analyze` | **Interactive Bundle Treemap**: Triggers production build with visual bundle map in `scratch/bundle_stats.html`. |

---

### 🔍 Specialized Sub-Auditors by Domain

Every architectural and domain standard has its own dedicated sub-auditor executable in isolation:

#### 🏛️ Architecture, Performance & Reactivity

| Command | Description |
| :-- | :-- |
| `npm run auditor:type-check` | Strict TypeScript and Vue SFC type verification with `vue-tsc --noEmit`. |
| `npm run auditor:z-index` | Strict 1:1 parity between `Z_LAYERS` (TypeScript) and `--z-*` CSS variables in `_base.scss` (supports `fix=true`). |
| `npm run auditor:duplicate-constants` | Identifies duplicate or divergent constant declarations across modules via shared AST. |
| `npm run auditor:stylelint` | Audits SCSS rules, mixins, and selectors across stylesheets and Vue components via Stylelint. |
| `npm run auditor:pinia-reactivity` | Audits Pinia stores against improper reactive destructuring and unwrapped state access. |
| `npm run auditor:reactive-leaks` | Detects memory leaks, uncleaned watchers, and orphan listeners. |
| `npm run auditor:reactive-purity` | Guarantees purity and absence of side effects in reactive mutations and getters. |
| `npm run auditor:client-sim-decoupling` | Enforces 100% strict decoupling between web client and `@pkmn/sim` runtime. |
| `npm run auditor:component-styles` | Validates style imports, standardized SCSS mixins, and absence of orphan sheets. |
| `npm run auditor:typography-line-height` | Prevents font descender clipping and validates vertical rhythm. |
| `npm run auditor:vue-sfc-hygiene` | Vue component hygiene: `<script setup>`, `scoped` styles, and SFC structure. |
| `npm run auditor:vue-sfc-hygiene` | Enforces deterministic, unique IDs in Vue templates for E2E automation. |
| `npm run auditor:accessibility` | Audits touch targets and mobile responsiveness. |
| `npm run auditor:console-cleanliness` | Bars `console.log` statements or debugging traces in production paths. |
| `npm run auditor:error-suppression` | Eradicates empty `catch` blocks, silenced promises, and swallowed errors. |
| `npm run auditor:audit-headers` | Bars file-level escape hatches (`fallow-ignore-file`, `@ts-nocheck`, etc.). |
| `npm run auditor:test-hygiene` | Audits test suites against tautological assertions and excessive mocking. |
| `npm run auditor:test-fragmentation` | Prevents micro-files (<60 LOC) and encourages cohesive test suites (300-800 LOC). |

#### 📚 Documentation & Links

| Command | Description |
| :-- | :-- |
| `npm run auditor:dox-integrity` | Validates structural `AGENTS.md` hierarchy, required sections, and `.gitignore` coverage. |
| `npm run auditor:markdown-links` | Validates relative links, cross references, and bars absolute or environment paths. |
| `npm run auditor:markdown-syntax` | Validates headings, tables, and Markdown syntax adhering to CommonMark. |

#### 🎮 Domain & Game Data

| Command | Description |
| :-- | :-- |
| `npm run auditor:domain-types` | Strict domain type and canonical union compliance (no `any` or loose strings). |
| `npm run auditor:o1-data-structures` | $O(1)$ optimization: typed dictionaries and sets in critical execution paths. |
| `npm run auditor:pokemon` | Base stats, types, and evolution tables verified against official Showdown Dex. |
| `npm run auditor:moves` | Move integrity, secondary effects, and canonical learnsets. |
| `npm run auditor:abilities` | Passive and field abilities checked against canonical engine. |
| `npm run auditor:items` | Item catalog, categories, tiers, and sprites. |
| `npm run auditor:sprites` | Physical presence of animated sprites, thumbnails, and collision-free icons. |
| `npm run auditor:spanish-ids` | Canonical parity and mapping of Spanish localized IDs. |
| `npm run auditor:spawns-whitelist` | Wild Pokémon spawn areas and encounter whitelists. |

#### 🗄️ Persistence, Migrations & State Machines (FSM)

| Command | Description |
| :-- | :-- |
| `npm run auditor:sql-migrations` | Incremental execution of 96 SQL migrations in in-memory SQLite (`node:sqlite`). |
| `npm run auditor:schema-parity` | 100% structural parity between SQLite and PostgreSQL schemas. |
| `npm run auditor:family:persistence` | 1:1 parity between in-memory state (`GameState`) and persisted schema (`SaveData`). |
| `npm run auditor:sql-anti-patterns` | Detects non-transactional queries and SQL anti-patterns. |
| `npm run auditor:fsm-implementation` | Unified FSM suite: Mermaid diagram parity, implementation, and execution flow. |
| `npm run auditor:showdown-parity` | Protocol coverage and canonical Showdown combat tokens. |
| `npm run auditor:combat-invariants` | Turn-based combat invariants, seat isolation, and command idempotency. |

---

### 🧪 Automated Tests, Fuzzers & E2E Simulations

The project features a 3-tier testing framework: Isolated unit tests, multi-threaded Showdown fuzzers, and browser-driven E2E simulations via Playwright.

#### 1. Unit & Logic Tests

```bash
# Run complete unit and node test suites
npm run test

# Unit tests for Vue components (JSDOM)
npm run test:unit

# Pure logic tests with native Node.js 26+ runner (multi-engine SQLite/PostgreSQL support)
npm run test:node

# Node tests in watch mode
npm run test:node:watch

# Strict SQL migration parity validation against fixtures (SQLite + Postgres)
npm run test:migrations

# Code coverage report
npm run test:coverage
```

#### 2. Combat Master Fuzzer (Showdown Parity)

Fuzzers execute thousands of automated combat turns with procedural team generation, catching desyncs and certifying test cases:

```bash
# Complete suite: Master Fuzzer + E2E Playwright
npm run sim:combat:all

# Master Fuzzer (runs all scenarios concurrently)
npm run sim:fuzzer

# Specialized fuzzers by subsystem:
npm run sim:fuzzer:moves       # Move effects and secondary triggers
npm run sim:fuzzer:abilities   # In-battle ability triggers
npm run sim:fuzzer:items       # Held items in combat
npm run sim:fuzzer:scenarios   # Complex tactical scenarios
npm run sim:fuzzer:breeding    # Daycare, genetics, and IV inheritance
npm run sim:fuzzer:missions    # Passive missions and rewards
npm run sim:fuzzer:gyms        # Gym leaders and badge rewards
npm run sim:fuzzer:gts         # Global Trade Station, trades, and escrow
npm run sim:fuzzer:ai          # AI heuristics and decision making
npm run sim:fuzzer:trace       # Deterministic replay of certified failure cases
```

#### 3. Sequential E2E Simulations (Playwright)

Full in-browser simulations featuring the official GUI, passive joystick, and event-driven synchronization:

```bash
# Run all E2E simulations sequentially one by one
npm run sim:e2e

# Display table of registered E2E simulations
npm run sim:e2e:table

# List paths of E2E simulation files
npm run sim:e2e:list

# Simulations by specific module:
npm run sim:e2e:battle         # All battle simulations
npm run sim:e2e:combat         # FSM battle flow and tactical scenarios
npm run sim:e2e:capture        # Capture mechanics, rates, respawns, and Ditto
npm run sim:e2e:pvp            # Competitive PvP, matchmaking, AFK, F5 reload, spectator
npm run sim:e2e:ai             # Combat against heuristic AI
npm run sim:e2e:search         # Map exploration and wild encounters
npm run sim:e2e:abilities      # Out-of-combat passive field abilities
npm run sim:e2e:items          # Item families, usage, and temporary buff expirations
npm run sim:e2e:events         # Fishing contests, weekly tournaments, and competitions
npm run sim:e2e:gts            # Trades and Global Trade Station (GTS)
npm run sim:e2e:save           # Secure saves, persistence, and active reload
npm run sim:e2e:breeding       # Daycare breeding and egg incubation
npm run sim:e2e:missions       # Mission assignments, collection, and class dispatch
npm run sim:e2e:gyms           # Gym challenges and battles
npm run sim:e2e:pokemon        # Friendship, storage, and Pokémon UI
npm run sim:e2e:system         # Version upgrades, locks, and lifecycle
```

---

### 🗄️ Database, Supabase Infrastructure & Maintenance

The project supports dual persistence with total isolation between local mode (native SQLite) and remote servers (Supabase / PostgreSQL on Docker or Cloud):

| Command | Description |
| :-- | :-- |
| `npm run database:repair-account` | **Illegal Account Repair**: Fixes illegal Pokémon (levels, moves, or invalid abilities) across accounts in local SQLite and Supabase. |
| `npm run database:diagnose-account` | **Account Diagnostics**: Checks integrity, inventory, illegal Pokémon, and locks for an account (`database:diagnose-accounts` for all). |
| `npm run admin:rename` | **Administrative Rename**: Updates a user's trainer name in Supabase directly from CLI. |
| `npm run servers:configure` | **Server Synchronization**: Parses master `.env` or CI secrets and generates decoupled catalog at `src/data/system/servers.local.json` with zero fallbacks. |
| `npm run database:update` | **Migration Manager**: Applies initial schemas and incremental SQL migrations to selected Supabase server (`server=<profile>`) or all (`all`). |
| `npm run database:backup` | **Backup Generator**: Connects to Supabase and dumps all tables into a structured JSON file. |
| `npm run database:upgrade-backup` | **Backup Upgrader**: Applies migrations and Showdown legality to an exported JSON backup. |
| `npm run database:restore` | **Transactional Restore**: Restores a JSON backup transactionally to the selected Supabase server. |
| `npm run database:local-import` | **SQLite Importer**: Imports the latest Supabase JSON backup into local SQLite for offline testing. |
| `npm run database:admin` | **User Administration**: Unban, change passwords, update emails, or promote users to admin from CLI. |
| `npm run supabase:manage` | **Docker/CLI Manager**: Local orchestrator for Supabase containers and Docker image compilation. |
| `npm run database:generate-migrations` | **Migration Compiler**: Scans `database/migrations/` and compiles the production TypeScript manifest. |
| `npm run database:recompile-feet` | **Footprint Compiler**: Recompiles and syncs the Pokémon footprint atlas and database. |
| `npm run sync:test` | **Sync to Sibling Repo**: Synchronizes source tree with sibling QA repository `pokevicio-test`. |

---

### 🔧 Illegal Account Repair Tool (`database:repair-account`)

This tool scans saved games in `game_saves`, audits all party and box Pokémon against Showdown rule engines, repairs inconsistencies (levels > 100, moves not permitted for species/learnset, non-canonical abilities), and persists fixes transactionally.

#### 1. Usage with Local Database (SQLite)

```bash
# Repair a specific account by user ID:
npm run database:repair-account user=local_ash

# Repair ALL accounts stored in local SQLite one by one:
npm run database:repair-account all

# Specify a custom SQLite database path:
npm run database:repair-account db=tests/fixtures/poke_local_ash.db all
```

#### 2. Usage with Remote Supabase / PostgreSQL Servers

```bash
# Repair a specific account in Supabase (by UUID, username, or email):
npm run database:repair-account server=server_franco user=Ash

# Repair ALL accounts in the remote Supabase server:
npm run database:repair-account server=server_franco all
```

---

#### Server Infrastructure Usage Examples

```bash
# 1. Synchronize servers into game UI
npm run servers:configure

# 2. Initialize or update database on a specific server
npm run database:update server=server_franco

# 3. Update database across ALL servers in .env
npm run database:update all

# 4. Download a full JSON backup from a server
npm run database:backup server=server_franco

# 5. Automatically restore the latest backup to a server
npm run database:restore server=server_franco

# 6. Restore a specific backup by providing exact file path
npm run database:restore server=server_franco file=database/backups/server_franco/server_franco_backup_2026-05-17T05-29-09.json
```

#### 🌐 Network Troubleshooting (MikroTik & Hairpin NAT)

If you experience external connectivity issues or timeouts connecting to NAS Supabase from outside your local network, consult [supabase_infrastructure_manual.md](./.agents/skills/project-standards/references/technical/supabase_infrastructure_manual.md).

Summary of MikroTik commands (Winbox / SSH) to resolve asymmetric routing issues:

1. **Mangle Rule Patch (Prevents load balancer bypass):**

   ```routeros
   /ip firewall mangle add chain=prerouting action=mark-routing new-routing-mark=to_ISP_1_franco passthrough=no src-address=192.168.88.200 src-port=8443 protocol=tcp connection-mark=ISP1-input comment="Parche Quirurgico - Supabase WAN1 Reply" place-before=[Excluir Router index]
   ```

2. **RouterOS v7 Routing Rules (FIB Association):**

   ```routeros
   /routing rule add routing-mark=to_ISP_1_franco action=lookup table=to_ISP_1_franco
   /routing rule add routing-mark=to_ISP_2_omar action=lookup table=to_ISP_2_omar
   ```

3. **NAS Firewall Bypass (Universal Hairpin NAT):** Remove the `src-address` filter in your Hairpin NAT rule to masquerade all incoming connections (local and external) with the router IP (`192.168.88.1`), ensuring the NAS accepts and replies correctly.

### Other Development Commands

```bash
npm run dev               # Start development environment (Vite)
npm run auditor:type-check    # Strict TypeScript type check
npm run test              # UI and component unit tests (Vitest)
npm run build             # Production compilation
npm run assets:download   # Download external sprites and assets (Gen 1-9, Items, Trainers)
npm run sync:test         # Sync source code to sibling QA repo pokevicio-test
```

### Golden Rules

- **GPU Performance**: Prioritize CSS3 hardware-accelerated transforms (`translate3d`), GPU layers, and avoid expensive filters in animation loops.
- **WebP Assets**: Raw PNG/JPG is forbidden; use the WebP conversion pipeline. (Exception: PokeAPI raw assets must remain PNG).
- **Fallow Quality Governance**: Modularity, function unit size (≤60 LOC), and cognitive/cyclomatic complexity thresholds are governed strictly by Fallow (Maintainability Index ≥ 85) rather than arbitrary line counts.
- **Server Isolation**: Never cross-contaminate data between Global (Supabase) and Local (SQLite) instances.

---

## 📦 Asset Management & Utilities

The project uses native tools to process assets securely and efficiently.

### 📥 Downloading Sprites and Resources

Use the unified script to download external game assets:

```bash
# Complete download (Pokemon Gen 1-9, Items, Trainers)
npm run assets:download

# Clean selective download (native positional support)
npm run assets:download items        # Items only (or npm run assets:download:items)
npm run assets:download pokemon      # Pokémon only (Front/Back/Shiny)
npm run assets:download trainers     # Trainers only
npm run assets:download 151         # First Generation only (positional limit)
```

> [!NOTE] Assets are downloaded into `external_assets/`. These files are excluded from the automatic `_raw-assets` pipeline by default to prevent repository bloat, but can be moved manually when processing is required.

### 🖼️ Asset Pipeline

Processes all images inside `_raw-assets`, converts them to WebP, and mirrors them into the project structure:

```bash
npm run assets:convert
```

> [!TIP] The script automatically detects Pixel Art (based on directory names like `sprites/` or `icons/`) and applies **Lossless** compression. For photographic or large assets, it applies adaptive quality based on resolution.

---

## 📂 Project Structure

- `/src`: Application source code (Vue 3 Components, Pinia Stores, Views, Showdown Bridge `@pkmn/sim`, DBRouter).
- `/public`: Public static assets (Maps, Audio, processed WebP Sprites).
- `/database`: Incremental SQL migrations (`.sql` PostgreSQL and `.sqlite.sql` SQLite), backups, and schemas.
- `/supabase`: Docker orchestrator and automation for Supabase microservices (`setup_supabase.ts`).
- `/scripts`: Multi-threaded fuzzers, Playwright E2E simulations, data compilers, and maintenance utilities.
- `/tests`: Unit testing suites (JSDOM) and node test suites (multi-engine Vitest SQLite/PostgreSQL).
- `/.agents`: DOX hierarchy containing agent skills, architectural standards, and reference manuals.
- `/_raw-assets`: Working directory for source images prior to WebP optimization (`npm run assets:convert`).
- `/scratch`: Unified ephemeral storage (JSON audit reports, temporary SQLite databases, simulation logs).

---

## 📖 Project Tutorials & Tips

### 1. 🛠️ Troubleshooting `npm run dev` Errors

If pulling changes from the repository (`git pull`) causes `npm run dev` to fail or report unexpected errors, it typically indicates new dependencies were introduced that are missing from your local environment.

- **Solution**: Run `npm ci` to cleanly synchronize dependencies according to `package-lock.json`.
- **Tip**: For version management and dependency upgrades, consult the [Dependency Management Manual](./.agents/skills/project-standards/references/technical/dependency_management_manual.md). Avoid unsupervised bulk `npm update` to prevent peer-dependency mismatches.

### 2. 🛡️ Standards & Quality Auditing

To maintain code cleanliness and architectural compliance, regularly run the official audit suites:

- **In development**: Run `npm run lint` (~8-10s) to validate domain types, $O(1)$, styles, and linters.
- **Full audit**: Run `npm run auditor` to execute the `@francogp/auditor` engine with tabular console summaries and JSON output in `scratch/audits/latest_audit.json`.
- **Findings inspection**: Use `npm run auditor:findings`, `npm run auditor:errors`, or `npm run auditor:warnings` to break down findings by category.

### 3. 🖼️ Image Management (`_raw-assets`)

The project uses a mirroring workflow to automatically optimize images to WebP:

- **Location**: Place original assets in `_raw-assets/`. The directory structure must mirror the project (e.g. `_raw-assets/public/assets/maps/`).
- **Compilation**: Run `npm run assets:convert`. The script processes everything:
  - **Conversion**: All images are transformed to `.webp`.
  - **Pixel Art Safety**: Images in `sprites`, `icons`, `badges`, or `items` folders receive **Lossless** compression to preserve crisp edges.
  - **Smart Quality**: Large images (> 250px) receive slight lossy compression to optimize initial page load.
- **Mirroring**: Converted assets are placed directly in the matching project directory (e.g. from `_raw-assets/public/...` to `public/...`).

### 4. ✨ Rendering: Pixelated vs Smooth

By visual identity, the "core" of the game is pixelated, while the "shell" (outer interface) is modern.

- **By default**: All assets are treated as pixelated.
- **Typography (Core)**: Pokémon names, stats, dialogues, and modal titles **MUST** use pixelated fonts (`Pokemon FireRed LeafGreen`, `VT323`) and the `@include pixelated;` mixin to prevent browser antialiasing blur.
- **Typography (Shell)**: Configuration menus, technical logs, and credits may use smooth fonts (`Outfit`, `Inter`).
- **Specification**: To guarantee pixel-perfect rendering, apply the `@include pixelated;` mixin in SCSS.
- **Exceptions**: For high-resolution logos or UI elements intended to look smooth, use `@include smooth;` (sets `image-rendering: auto`).

### 5. 📚 DOX Navigation & Governance (`/dox-navigator` and `AGENTS.md`)

All technical architecture, localized folder rules, and interface contracts are governed by the DOX system:

- **Close-to-Code Contracts**: Every code folder contains its own `AGENTS.md` defining scope, local contracts, and `Child DOX Index`.
- **Document Integrity**: Any structural modification or directory addition must keep its `AGENTS.md` index updated, validated via:

  ```bash
  npm run auditor:md
  ```

### 6. 🔍 Debugging & Console Commands

To inspect states or force test scenarios, the project exposes a secure debug proxy.

- **Access**: Open browser console (`F12`) and use `window.__VITE_DEBUG__`.
- **Examples**:
  - `__VITE_DEBUG__.addMoney(9999)`: Add funds.
  - `__VITE_DEBUG__.setWeather('rain')`: Change active weather.
  - `__VITE_DEBUG__.spawnPokemon(25)`: Spawn a Pikachu encounter.
- **Battle Auditing**: When debugging the combat state machine (FSM):
  - `npm run auditor:fsm-implementation`: Complete FSM validation suite (diagrams, implementation, and flow).
  - `npm run auditor:fsm-flow-parity`: Checks for race conditions in state transitions.
- **Security**: These commands are disabled in production for standard user accounts (see section 7).

### 7. 🛡️ Security & Moderation System (Bans)

The project includes an automated defense mechanism (**"Ban Trap"**) to prevent misuse of development tools in production environments.

- **Automatic Detection**: If an account with the `user` role attempts to invoke debug API methods (`window.__VITE_DEBUG__`) or interact with the dev panel in **ONLINE** mode:
  1. The account is flagged as banned (`is_banned: true`) in the database.
  2. The ban reason is logged.
  3. The active session is immediately terminated.
- **Visual Feedback**: Banned users receive an **ACCESS DENIED** retro-styled modal upon attempting to log in, displaying the sanction reason.
- **Account Restoration**: Bans remain permanent until manually revoked by an administrator using the CLI admin tool (`database:admin`).
  - **Unban Command**:

    ```bash
    npm run database:admin server=server_franco action=unban email=user@example.com
    ```

- **Local Mode**: In `offline` (localhost) mode, ban traps are bypassed to allow unrestricted testing.

### 8. 🛡️ User Maintenance (Admin CLI)

The project features a unified administration tool (`database:admin`) that connects natively to any Supabase instance (Cloud or local Docker) using master `.env` credentials, enabling advanced maintenance operations without opening the SQL Editor or writing manual queries.

#### Change User Password

To securely reset a password (generating bcrypt hashes on the server):

```bash
npm run database:admin server=server_franco action=set-password email=user@example.com password=NEW_SECURE_PASSWORD
```

#### Change User Email

The tool updates both the auth table (`auth.users`) and the public profile (`public.profiles`) in a single DML transaction to maintain consistency:

```bash
npm run database:admin server=server_franco action=set-email email=old@example.com new-email=new@example.com
```

#### Change Trainer Name (Username)

```bash
npm run database:admin server=server_franco action=set-username email=user@example.com username=NewTrainerName
```

#### Promote to Administrator (ADMIN Role)

To grant administrative privileges (debug panels in production, ban-trap bypass, etc.):

```bash
npm run database:admin server=server_franco action=promote email=user@example.com
```

> [!IMPORTANT] Usernames must be unique. If a username is already taken, the tool catches the `UNIQUE` constraint violation and outputs a clear warning in the console.
