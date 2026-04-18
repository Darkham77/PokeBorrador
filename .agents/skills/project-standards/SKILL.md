---
name: project-standards
description: MANDATORY development philosophy for every stage of reasoning, design, and implementation. This is NOT a final check; it is the project's DNA. Enforces Hybrid Retro-Modern aesthetics, GPU efficiency, strict DB isolation, and modularity. MUST be active at all times.
---

# Project Standards & Philosophy

Goal: This is the project's core philosophy. It ensures that every action taken—from initial reasoning to final implementation—is syntactically perfect, optimized for mobile GPU (Phaser), and adheres to our unique Hybrid Retro-Modern identity.

## Core Philosophy: Design-by-Standard

These standards are not a "post-facto" checklist. They are part of the project's fundamental DNA. As the agent, you **MUST**:

- **Reason with Standards**: Every plan you draft must be built on these foundations.
- **Design with Standards**: UI shells must be modern/premium, while content heart must be Pixel Art.
- **Implement with Standards**: Never compromise on DB isolation or modularity for short-term speed.

Failure to adhere to these standards at any stage of the workflow is considered a critical architectural failure.

## GPU Efficiency & Phaser Rendering Standards

To maintain 60FPS on mobile devices, we follow strict rendering rules. Global "draw calls" are the primary enemy.

### 1. Texture Atlas Mandate

- **FORBIDDEN**: Loading individual sprite images (e.g., `scene.load.image('ball', '...')`) for frequently used entities.
- **REQUIRED**: All game assets (UI, NPCs, FX) **MUST** be packed into **Texture Atlases** (using TexturePacker or similar).
- **Reasoning**: This allows Phaser to batch draw calls into a single operation, drastically reducing GPU overhead.

### 2. Culling & Batching

- **Auto-Culling**: Surfaces or objects outside the camera view **MUST** have their `active` and `visible` properties set to `false` or be managed by Phaser's internal culling.
- **Layering**: Group sprites by texture atlas in the scene rendering order to maximize batching efficiency.

## Assets & Optimization Standards

To ensure minimal data transfer and optimal load times, all visual assets must be optimized.

### 1. WebP Mandate

- **MANDATORY**: All images stored in the project (`src/assets/`, `public/assets/`, etc.) **MUST** be in **WebP** format.
- **FORBIDDEN**: Storing raw `.png`, `.jpg`, or `.jpeg` files in the repository.
- **Auto-Conversion**: If a non-recommended format is detected during development or migration, you **MUST** execute the conversion script (`.agents/skills/project-standards/scripts/convert_to_webp.py`) to transform it into WebP.
- **Quality Settings**:
  - **Pixel Art**: Use lossless WebP to preserve pixel-perfect clarity.
  - **Large Assets**: Use lossy WebP (Quality 80) for maximum compression.

## Mobile Optimization & Memory Mandate

Mobile browsers have limited memory and aggressive garbage collection.

### 1. Object Pooling

- **MANDATORY**: Any entity that is frequently created/destroyed (bullets, particles, floating text, wild pokemon encounters) **MUST** use an **Object Pool**.
- **Implementation**: Use `Phaser.GameObjects.Group` with `classType` and `runChildUpdate: true`. Reclaim objects using `killAndHide()`.

### 2. Adaptive Resolution & Input

- **DPR Scaling**: Use `window.devicePixelRatio` to set the game resolution. Avoid scaling a tiny canvas to a giant screen; use Phaser's `ScaleManager` with `RESIZE` or `FIT`.
- **Touch-First UI**: Interactive elements **MUST** have a minimum hit area of 44x44px. Use `pointerup` instead of `pointerdown` for primary actions to allow for scroll cancellation.

## Phaser + Vue Integration Rules

To avoid performance death by a thousand reactivity "checks":

- **Store Decoupling**: DO NOT store large Phaser objects (Scenes, GameObjects, Sprites) inside reactive Vue refs or Pinia state.
- **The Bridge Pattern**: Use an event bus or a non-reactive "Game Instance Router" to pass data from Vue to Phaser.
- **Shallow Refs**: If you must store the Phaser Game instance in a Vue component, use `shallowRef()`.

## Modularization & File Length Standards

To maintain a healthy, readable codebase, we follow a strict **Modularization Policy**. High-density files are difficult for agents to process reliably and are prone to logic errors.

### 1. The 500-Line Rule

Any `.vue`, `.js`, or `.scss` file inside the project **MUST NOT** exceed 500 lines, with the following **MANDATORY EXCEPTIONS**:

- **External Dependencies & Legacy Backups**: Files in `node_modules/` or `backup_legacy_code/`.
- **Data-Heavy Definition Files ("Pseudo-Databases")**: Files used strictly for data storage/definitions that are not yet in Supabase/SQLite (e.g., `schedules`, `conflict routes`, `game constants`, `coordinate maps`).
  - **Optimization Requirement**: These large files **MUST** be optimized for Vue. Use `shallowRef` or `readonly` for static data to prevent excessive reactivity overhead, and ensure they are imported as ES Modules to take advantage of treeshaking if possible.

- **Maintenance**: If you touch a logic or component file that is already over 500 lines and is NOT a data-heavy file, you **MUST** refactor it into smaller modules.

### 2. Refactoring Strategies

- **Vue Components**:
  - **Script**: Extract business logic into `src/composables/` (Composition API) or Pinia stores.
  - **Styles**: Move component-specific styles to `src/styles/components/` and import them via `@use` or `@import`.
  - **Template**: Break down the template into logical sub-components (e.g., `BattleHUD.vue`, `BoxGrid.vue`).
- **Styles (SCSS)**:
  - Split large stylesheets into feature-specific partials.
  - Example: `_battle.scss` -> `_battle-hud.scss`, `_battle-animations.scss`, `_battle-stats.scss`.
- **Logic (JS)**:
  - Extract utility functions to `src/logic/utils/`.
  - Use modular classes or function sets instead of monolithic bridges.

## Styling & Aesthetic Standards: Hybrid Retro-Modern Mandate

To maintain a unique, high-end visual identity, the project follows a **Hybrid Retro-Modern** aesthetic. We prioritize a deliberate contrast between modern, sleek UI shells and classic, pixel-perfect content.

### 1. The Hybrid Mandate

- **Modern UI Shell (Containers & Layouts)**:
  - **REQUIRED**: Use state-of-the-art UI techniques for layouts, cards, and backgrounds.
  - **Techniques**: Glassmorphism (`backdrop-filter: blur`), subtle HSL gradients, smooth shadows, and fluid transitions.
  - **Goal**: The "frame" must feel premium, modern, and reactive.
- **Pixel Art Content (The "Game Heart")**:
  - **MANDATORY**: All game-world elements **MUST** be Pixel Art. This includes **Sprites**, **Icons**, and **GAME TEXT** (Typography).
  - **FORBIDDEN**: Using modern high-res vector icons (SVG) or smooth modern fonts for primary game data/interaction.
  - **Asset Rendering**: Use `image-rendering: pixelated;` strictly for these elements.

### 2. Detection & Warning Policy

- **Audit Requirement**: You **MUST** audit every UI component and visual asset during development.
- **Non-Compliance**: If you detect "smooth" modern icons, vector graphics, or non-pixelated fonts used for game content, you **MUST** warn the user.
- **Proactive Migration**: Always suggest and provide the SCSS/Asset path to migrate smooth elements to the Hybrid Retro-Modern standard.

- **Reference**: See [references/sass_styling_manual.md](./references/sass_styling_manual.md) for technical setup, Pixel Art font families, and migration guides.

## Database & Context Architecture

All database interactions **MUST** go through the **Unified DB Router** to ensure seamless online/offline routing and absolute data isolation.

- **FORBIDDEN**: Direct calls to `supabase.from()`, `sqlDb.run()`, or any specific provider adapter inside UI components or feature services.
- **Principle**: The DBRouter contextually routes requests to Global (Supabase) or Local (SQLite) instances based on the session.
- **Reference**: See [references/dbrouter_manual.md](./references/dbrouter_manual.md) for context routing logic, the ProxyQuery pattern, and implementation examples.

### Strict Server & Session Isolation

The application **MUST** maintain absolute isolation between server contexts. A session initiated in one context (Global/Online) **MUST NEVER** bridge data or world-states with another (Local).

- **Reference**: See the "Isolation Mandate" section in [references/dbrouter_manual.md](./references/dbrouter_manual.md) for definitions of Global vs. Local world-states.

### Database Schema & Migration Mandate

Strict versioned migration patterns are mandatory. You **MUST** maintain **Triple Sincronización** parity for every schema change across three locations:

1. **SQL Migration**: A timestamped file in `database/migrations/` (e.g., `YYYYMMDDHHMMSS_description.sql`).
2. **Migration Array**: The exact SQL code added to the `DATABASE_MIGRATIONS` array in `src/logic/db/sqliteIDBHandler.js`.
3. **Absolute Schemas**: The corresponding table definition(s) updated in `database/schemas/` to reflect the new state.

- **Triple Source of Truth**: We maintain timestamped deltas (migrations), baseline schemas, and the JS logic layer. None must ever be out of sync.
- **Remote Transparency**: You **MUST** always provide the user with the exact SQL code to be executed in the remote database (Supabase) for every schema change.
- **Reference**: See [references/dbrouter_manual.md](./references/dbrouter_manual.md) for naming conventions and the migration workflow.

### Database Compatibility & Migration Version Mandate

To prevent data corruption and ensure security, the application enforces strict versioning between the game client and the database based on applied migrations.

- **Mandatory Version Table**: Every database (Supabase/SQLite) **MUST** have a `system_config` (online) or `config` (offline) table with a `db_version` entry.
- **Client Guard**: The client defines a `CLIENT_DB_VERSION` (a numeric timestamp). If `CLIENT_DB_VERSION > DB_VERSION`, the app **MUST** block access and notify the administrator.
- **Migration Version Mandate**: Every SQL migration file **MUST** conclude with a statement that **sets** the `db_version` to the migration's unique timestamp ID.
  - **Supabase (JSONB)**: `UPDATE public.system_config SET value = jsonb_build_object('db_version', 'YYYYMMDDHHMMSS') WHERE key = 'db_version';`
  - **SQLite (TEXT)**: `UPDATE config SET value = 'YYYYMMDDHHMMSS' WHERE key = 'db_version';`
- **Triple Synchronization**: Every time a migration is added, the `CLIENT_DB_VERSION` in `dbRouter.js` must be updated to match the timestamp ID of the latest migration.

## Logic Testing Mandate & Database Isolation Policy

To maintain a high-quality, stable codebase, we strictly enforce a policy of **Mandatory Testing** and **Data Isolation**.

### 1. The Logic Testing Mandate

- **REQUIRED**: Every new algorithm, complex calculation, or critical logic path **MUST** be accompanied by a suite of Unit Tests.
- **STANDARD**: The project's existing test suite (`npm run test`) must maintain a **100% Pass Rate**. You are forbidden from submitting code that breaks existing tests.

### 2. Database Isolation Policy

To prevent data corruption and ensure reproducible results, tests involving database operations **MUST** follow these rules:

- **Isolated Environments ONLY**: Tests must run in a controlled, volatile environment that is easy to destroy.
- **DBRouter Configuration**: When running unit or integrity tests, `DBRouter` **MUST** be initialized in **Test Mode** (e.g., using the `{ inMemory: true }` or `{ dbName: 'pokevicio_test_db' }` options).
- **FORBIDDEN**: Running tests that modify the production database (Supabase) or the user's primary local save (`pokevicio_idb`).
- **Initialization**: Use the baseline schemas from `database/schemas/` to initialize test databases from scratch.

## Cache, Sync & Asset Integrity

To prevent data corruption and ensure a secure multi-device experience, strict synchronization policies are enforced.

### 1. Synchronization Principles

- **60-Second Sync**: A throttling mechanism to minimize server load. It is NOT for long-term state.
- **Mandatory Cache Invalidation**: Local throttle caches (`save_throttle_cache`) **MUST** be discarded on **Login** and **Tab Initialization** to force an absolute fetch from the DB.
- **Protocol: Pre-Action Flush**: Before any social or trade action (sending a trade, GTS listing, etc.), a forced atomic save **MUST** be triggered to ensure world-state integrity.

### 2. Asset Integrity & Abuse Control

- **Server-Side Escrow**: All trades and sales move assets out of the player's inventory into server custody (Pending Claim table) until the recipient explicitly claims them.
- **Claim Queues**: Assets received are held in a queue. Claiming them is an atomic process that requires a prior `Pre-Action Flush`.
- **Anti-Spam Throttling**: A mandatory **5-second cooldown** is enforced between individual claim actions.
- **Modular Quotas**: Interactions (Friends, Trades, GTS) are capped at a default of **50 slots** each.

- **Reference**: See [references/security_and_sync_manual.md](./references/security_and_sync_manual.md) for technical implementation of the discard strategy, Escrow workflows, and Rollback protocols.

## Concurrency & Session Standards

Only one active browser tab or application instance is allowed per account to prevent world-state corruption.

- **Last-In-Wins Strategy**: The most recently opened instance takes control using UUID-based locks and Realtime monitoring.
- **Automatic Invalidation**: Mismatched sessions **MUST** result in immediate blocking overlays and disabling of write-access.
- **Reference**: See [references/security_and_sync_manual.md](./references/security_and_sync_manual.md) for the full UUID detection and invalidation workflow.

## Code Reuse & Inheritance Mandate

To maintain a clean and maintainable codebase, we strictly follow the **DRY (Don't Repeat Yourself)** principle through inheritance and abstraction.

### 1. Inheritance-First Approach

Prioritize inheritance over code duplication in all layers of the application.

- **Styles (SCSS)**:
  - Use `@extend %placeholder` or parent classes for shared UI patterns (e.g., `.battle-btn`, `.modal-card`).
  - Extract repeating numeric values or shared effects to SCSS mixins or design tokens.
- **Logic (JS/TS)**:
  - Use shared **Composables** or utility functions for repeating logic blocks.
  - If multiple logic sets share a common structure, refactor them into a shared base file.
- **Components (Vue)**:
  - Favor generic base components that can be customized via `props` and `slots`.
  - Do not create two components that share 80% of their template; instead, create a parent component and use slots for specific parts.

### 2. The "Rule of Three"

If you find the same logic or style block in **more than 2 places**, you **MUST** refactor it into a shared upstream dependency (Partial, Mixin, Composable, or Base Component) before proceeding.

## SASS Modern Syntax Mandate (Dart Sass 2.0+)

To prevent build warnings and future-proof the application, you **MUST** use the modern SASS module system. Global built-in functions are **FORBIDDEN**.

### 1. Module Imports

- **REQUIRED**: Always use `@use "sass:math";` or `@use "sass:string";` at the top of the `<style lang="scss">` block or `.scss` file if you use built-in functions.

### 2. Function Replacements

- **FORBIDDEN**: `random()`, `unquote()`, `unit()`, `percentage()`, `abs()`, `round()`, `ceil()`, `floor()`.
- **REQUIRED**:
  - `random(...)` -> `math.random(...)`
  - `unquote(...)` -> `string.unquote(...)`
  - `scale(...)` -> `string.unquote("scale(...)")` (Avoids color function collision)
  - `grayscale(...)` -> `string.unquote("grayscale(...)")`
  - `invert(...)` -> `string.unquote("invert(...)")`
  - `unit(...)` -> `math.unit(...)`
  - `percentage(...)` -> `math.percentage(...)`
  - `abs(...)` -> `math.abs(...)`
  - `round(...)` -> `math.round(...)`
  - `ceil(...)` -> `math.ceil(...)`
  - `floor(...)` -> `math.floor(...)`

### 3. Automatic Validation

- **MANDATORY**: You **MUST** run `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` after any UI modification to ensure no deprecated globals were introduced.

## Dev Server Management

To avoid port conflicts and resource waste, we must ensure only one instance of the development server is running.

- **Instance Detection**: Always check for running `vite` processes before executing `npm run dev`.
- **Reuse Policy**: If an instance is already running (usually on port 5173 or 5174), reuse it instead of starting a new one.

## Workflow

### 1. File Length Audit

Before finalizing, verify that no touched files violate the length standard:

```bash
# In Bash-like environments:
find . -maxdepth 4 -type f \( -name "*.vue" -o -name "*.js" -o -name "*.scss" \) -not -path "./node_modules/*" -not -path "./.agents/*" -not -path "./backup_legacy_code/*" -not -path "./dist/*" -exec wc -l {} + | awk '$1 > 500 && $2 != "total"'

# In PowerShell:
Get-ChildItem -Recurse -File -Include *.vue, *.js, *.scss | Where-Object { $_.FullName -notmatch "node_modules|\.agents|backup_legacy_code|dist" } | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 500) { "$lines`t$($_.FullName)" } }
```

> [!IMPORTANT]
> If any files appear in the output (especially those you modified), you **MUST** refactor them before presenting the results.

### 2. Python Environment Check

Verify that Python dependencies are installed for the optimization scripts:

```bash
pip install -r requirements.txt
```

### 3. Build, Lint & Test Verification

Execute the official validation scripts:

```bash
npm run lint
npm run test
npm run build
```

### 3. Dev Server Instance Check

Before starting a new development server, verify if one is already active:

```bash
# In Bash-like environments:
pgrep -af vite || echo "No vite instances running"

# In PowerShell:
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "vite" } | Select-Object ProcessId, CommandLine
```

> [!WARNING]
> If the command above returns existing processes, **do NOT** run `npm run dev`. Reuse the existing session to avoid port clashing and high CPU usage.

### 4. Phaser Performance Audit

If the changes involve any game scenes or entities, verify:

- `[ ]` **Asset Check**: Are all new sprites part of a Texture Atlas?
- `[ ]` **Memory Check**: If spawning entities, is an Object Pool being used?
- `[ ]` **Reactivity Check**: Are Phaser objects kept out of Vue's reactive state (refs/Pinia)?

### 5. Analyze & Response

- **Lint Failed**: Review and fix errors immediately.
- **Build Failed**: Dig into the build log to find structural errors (missing imports, Vite config issues).
- **Server Running**: Skip `npm run dev` and proceed with the existing instance.
- **MANDATORY**: Do **NOT** proceed to browser testing or `browser_subagent` until these commands pass.

## Troubleshooting

- If `npm run lint` fails on files you didn't touch, run it with `--fix` if the error is minor.
- Aim to leave the codebase cleaner/more modular than you found it.

## Audit Checklist

1. `[ ]` Run length audit: No violator files in project (excluding node_modules/backups).
2. `[ ]` **Phaser Performance**: Texture Atlases, Object Pooling, and Vue decoupling verified.
3. `[ ]` `npm run lint`: Execution success (0 errors).
4. `[ ]` `npm run test`: Execution success (0 failures).
5. `[ ]` **Test Coverage**: New logic/algorithms have accompanying unit tests.
6. `[ ]` **DB Isolation**: Tests use isolated/in-memory instances via DBRouter options.
7. `[ ]` **Python Deps**: `pip install -r requirements.txt` executed/verified.
8. `[ ]` **SASS Protection**: Running `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` returns success.
9. `[ ]` **Hybrid Retro-Modern**: Verified Modern UI frames vs. Pixel Art content heart (@/references/sass_styling_manual.md).
10. `[ ]` Dev Server Check: No duplicate instances or reused existing one.
