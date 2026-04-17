---
name: project-standards-checker
description: MANDATORY skill for verifying code quality, GPU efficiency, mobile optimizations, Phaser standards, SASS Technical Protection, and Unit Tests. Use this BEFORE starting browser tests. Ensures Texture Atlases, Object Pooling, Phaser+Vue decoupling, No Monolithic Files (>500 lines), Unit Test completion, SASS trap prevention, and Unified DB Router compliance.
---

# Project Standards Checker

Goal: Ensure that every piece of code delivered is syntactically correct, optimized for mobile GPU (Phaser), and remains modular for optimal AI and human readability.

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
- **Auto-Conversion**: If a non-recommended format is detected during development or migration, you **MUST** execute the conversion script (`.agents/skills/project-standards-checker/scripts/convert_to_webp.py`) to transform it into WebP.
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

## Styling Standards

To maintain visual consistency and leverage the full power of our UI framework, we adhere to strict styling rules.

- **NO Hardcoded Styles**: You **MUST NEVER** use inline styles (`style="..."` in HTML/Vue) or hardcoded CSS values directly in components unless absolutely necessary (e.g., dynamic calculation in JS).
- **Prioritize SCSS**: Always extract styles to SCSS files/blocks and use the project's CSS/SCSS design tokens. If a unique style is needed, create the appropriate class in the component's `<style lang="scss">` or the global partials.
- **Critical Cases ONLY**: Inline styles are only acceptable when calculating elements dynamics via Javascript where there is literally no other option.

### 2. SASS Technical Protection

- **MANDATORY**: You **MUST** use interpolation `#{}` for CSS functions that collide with Sass built-ins (e.g., `scale()`, `invert()`).
- **Validation**: Execute the SASS check script (`.agents/skills/sass-styling-protection/scripts/check_sass_traps.py`) to verify compliance. Failure to use interpolation on `scale()` is considered a build-blocking error.
- **Architecture**: Always prefer `@use` over the deprecated `@import`. Define variables in tokens and access them via namespaces.

## Database & Context Architecture

To ensure the application can handle both Online and Offline modes seamlessly, we follow a strictly decoupled data access pattern.

### 1. Unified DB Router Mandate

All components, services, and logic modules **MUST** interact with the database through the **Unified DB Router** (typically `window.DBRouter` or a dedicated logic bridge).

- **FORBIDDEN**: Direct calls to `supabase.from()`, `sqlDb.run()`, or any specific provider adapter inside UI components or feature services.
- **Reasoning**: The DB Router contextually decides whether to use a Global Instance (Supabase/Others) or a Local Instance (SQLite) based on the user's session. Bypassing it breaks the application's ability to sync and route data correctly and violates the isolation principle.
- **Pattern**:
  - *Wrong*: `await supabase.from('inventory').select('*')`
  - *Correct*: `await DBRouter.from('inventory').select('*')`

### 3. Strict Server & Session Isolation Mandate

The application **MUST** maintain absolute isolation between server contexts (Global vs. Local). A session initiated in one context **MUST NEVER** bridge data, interactions, or world-states from another.

- **Global Instance (Online / External Server)**: Any instance connected to a shared server (e.g., Supabase, Beta Server, Private Cloud).
  - The user interacts in a shared world with other humans.
  - Persistence is 100% remote.
  - The **Realtime** system is vital for synchronizing competitive events (War, Chat, Trade).
  - **Global Stay-Global**: No access or synchronization with browser data (SQLite) is permitted.
- **Local Instance (Client / In-Browser Processed)**: A private instance running entirely via SQLite/IndexedDB.
  - The user interacts in their own private world.
  - No external connectivity exists; all social mechanics must be **locally simulated**.
  - **Local Stay-Local**: No reporting data to servers or receiving real-time updates is permitted.
- **Reasoning**: This prevents critical data corruption, ensures world-state integrity, and maintains the boundary between a shared global world and a private local environment. Any attempt to bridge these worlds is considered a CRITICAL architectural violation.

### 2. Database Schema & Migration Mandate

When introducing or modifying database tables or columns, we follow a strict **Versioned Migration Pattern**.

- **Automatic Local Migrations**:
  - The application must include logic to automatically update the local database (SQLite/IndexedDB).
  - Use the `DATABASE_MIGRATIONS` array in `src/logic/sqliteIDBHandler.js`.
  - **MANDATORY PARITY**: Every new SQL file created in `database/migrations/` **MUST** have a corresponding entry in the `DATABASE_MIGRATIONS` array with the exact same ID.
- **Official Migration System (@/database)**:
  - **Dual Source of Truth Mandate**: We use both `migrations/` and `schemas/` to balance deployment history and architectural visibility.
    - **Migrations (`database/migrations/`)**: Mandatory for tracking deltas, deployment history, and cross-team synchronization.
    - **Schemas (`database/schemas/`)**: Mandatory baseline reference representing the CURRENT absolute state. Primarily used for documentation and fresh-install clarity.
  - **MANDATORY SYNCHRONIZATION**: For every new timestamped `.sql` file created in `database/migrations/`, you **MUST** update the corresponding baseline file in `database/schemas/` (or create a new one) to ensure they are 100% in sync. Fresh installs must rely on `schemas/`.
  - **REMOTE SQL VISIBILITY**: You **MUST** always show the user the exact SQL code to be executed in Supabase for every migration performed.
- **Remote SQL Communication**:
  - For every schema change, the AI **MUST** provide the user with the exact SQL code to execute in the remote database (e.g., Supabase SQL Editor).
  - This SQL **MUST** match the contents of the latest file in `database/migrations/`.
- **Naming Convention**:
  - Migration files must be stored in `database/migrations/`.
  - Use the format: `YYYYMMDDHHMMSS_description_of_change.sql`.
  - Example: `20240416193000_add_session_id_to_profiles.sql`.
- **Workflow**:
  1. Create a new timestamped `.sql` file in `database/migrations/`.
  2. Implement the same SQL logic in the `DATABASE_MIGRATIONS` array in `sqliteIDBHandler.js`.
  3. Display the **"REMOTE SQL MIGRATION"** block for the user, referencing the new file.

## Cache & Synchronization Integrity

To prevent data loss and ensure a consistent cross-device experience, we strictly manage local state caches.

### 1. The "60-Second" Sync Principle

The 60-second synchronization cycle is a **throttling mechanism** design to minimize server load. It is **NOT** a persistent reliable storage for long-term state.

### 2. Mandatory Cache Invalidation

Caches used for throttling updates **MUST** be discarded in the following scenarios:

- **On Login**: Clear any existing save-data cache before performing the initial "Pull" from the database.
- **On Tab Init**: Whenever the application is opened in a new tab, force a fresh download from the cloud/local DB instead of using a potentially stale 1-minute-old throttle cache.

**Technical Reference (Discard Strategy)**:
When implementing login or application hydration:

```javascript
// Ensure stale throttle data is wiped
localStorage.removeItem('save_throttle_cache'); 
// Force absolute source-of-truth fetch
const { data } = await DBRouter.from('game_saves').select('*').single();
```

## Session & Concurrency Standards

To prevent world-state corruption and ensure account security, we strictly enforce a unique session policy across all platforms.

### 1. Single Session Access (Last-In-Wins)

Only one active browser tab or application instance is allowed per account.

- **Workflow**:
  1. **UUID Core**: Generate a unique `SessionID` (UUID) upon every fresh application load.
  2. **DB Lock**: On login, update the user profile's `current_session_id` in the database with the local `SessionID`.
  3. **Continuous Monitoring**: Subscribe to database changes (Realtime) on the user's profile to detect if the session ID has been updated by another instance.
  4. **Wake-up Validation**: On `visibilitychange` (returning to tab) or `focus`, explicitly fetch the latest `current_session_id` from the DB.
  5. **Invalidation Response**: If a mismatch is detected (local ID != DB ID):
     - **Block Access**: Display the "Session Expired" overlay immediately.
     - **Kill Write-Access**: Disconnect all saving logic and background syncs.

- **Reasoning**: This "Last-In-Wins" strategy ensures the most recently opened tab has exclusive control, preventing older tabs from accidentally overwriting newer progress.

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
5. `[ ]` `npm run build`: Execution success.
6. `[ ]` **Python Deps**: `pip install -r requirements.txt` executed/verified.
7. `[ ]` **SASS Protection**: Running `python3 .agents/skills/sass-styling-protection/scripts/check_sass_traps.py` returns success.
8. `[ ]` **Premium Aesthetics**: Hover effects, Glassmorphism, and HSL palettes verified (@/sass-styling-protection).
9. `[ ]` Dev Server Check: No duplicate instances or reused existing one.
