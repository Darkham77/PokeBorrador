---
name: project-standards
description: MANDATORY project standards. Use this skill for EVERY SINGLE turn in this repository. It governs GPU efficiency, Hybrid Retro-Modern aesthetics, DB isolation, and file modularity. NEVER perform any coding or design task without loading this skill first.
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
- **FPS Capping**: Always cap Phaser at **60 FPS** in `phaser/config.js` with `forceSetTimeOut: true` to prevent CPU spikes and thermal throttling on high-refresh monitors.

### 2. Culling & Batching

- **Auto-Culling**: Surfaces or objects outside the camera view **MUST** have their `active` and `visible` properties set to `false` or be managed by Phaser's internal culling.
- **Layering**: Group sprites by texture atlas in the scene rendering order to maximize batching efficiency.
- **Filter Cumulative Cost**: Avoid using expensive CSS filters like `backdrop-filter` or `drop-shadow` inside large loops (e.g., map grid icons). Use opacity transitions or pre-rendered assets instead.

## Assets & Optimization Standards

To ensure minimal data transfer and optimal load times, all visual assets must be optimized via the **Zero-Config Asset Pipeline**.

### 1. The Zero-Config Asset Pipeline (WebP & LOD)

- **MANDATORY**: All final images used in the project (`src/assets/`, `public/assets/`) **MUST** be in **WebP** format.
- **FORBIDDEN**: Storing raw `.png`, `.jpg`, or `.jpeg` files in the final destination directories.
- **EXCEPTION: PokeAPI Assets**: Data fetched dynamically from PokeAPI **MUST** use **PNG** format.

#### Folder Mirroring Architecture

To process raw images (like PNGs), the project uses a "Mirroring" structure inside the root directory `_raw-assets/`. You **MUST** explain this to the user if they ask about adding new images.

```text
_raw-assets/
├── lod/                           <-- Images here will generate multi-size LODs
│   ├── public/assets/maps/        <-- Mirrors the exact destination in the project
│   │   └── main_city.png          (Outputs WebP + LODs to public/assets/maps/)
│   └── src/assets/ui/
│       └── background.png         (Outputs WebP + LODs to src/assets/ui/)
└── original/                      <-- Images here will NOT generate LODs (1:1 size only)
    ├── public/assets/sprites/
    │   └── hero.png               (Outputs 1:1 WebP to public/assets/sprites/)
    └── src/assets/vfx/
        └── explosions.atlas/      <-- Folders ending in .atlas will be packed
            ├── spark_1.png
            └── spark_2.png        (Outputs explosions.json + explosions.webp)
```

#### Smart Dynamic Scaling (LOD Rules)

When processing images in the `lod/` folder, the script applies smart breakpoints based on the original width to preserve pixel-perfect clarity for small assets:

- **< 500px**: No downscaling. Generates `@1x`, `@0.5x`, and `@0.25x` all at **100% scale** (prevents blurriness in UI/Avatars).
- **500px to 999px**: Generates `@1x` (100%), `@0.5x` (50%), and `@0.25x` (at 50% to avoid extreme pixel loss).
- **>= 1000px**: Generates `@1x` (100%), `@0.5x` (50%), and `@0.25x` (25%).

#### Texture Atlas vs. Individual Assets

- **Individual Files**: Any file placed in `_raw-assets/lod/` or `original/` results in individual `.webp` files. Best for **Vue UI Banners**, **Backgrounds**, and **Large Portraits**.
- **.atlas Folders**: Any folder ending in `.atlas` (e.g., `vfx.atlas/`) will be compiled into a **Texture Atlas** (JSON + WebP). Best for **Phaser FX**, **Animations**, and **Batched Sprites**.

- **Execution**: To process the `_raw-assets/` folder, you **MUST** execute the conversion script (`python3 .agents/skills/project-standards/scripts/convert_to_webp.py`).

### 2. Mandatory Script Error Reporting

All automation scripts (asset pipelines, database migrations, validators) **MUST** implement high-visibility error reporting:

- **REQUIRED**: Any script that encounters a partial or total failure **MUST** return a **non-zero exit code**.
- **REQUIRED**: The script output **MUST** conclude with a clear summary block if errors occurred, using high-contrast identifiers (e.g., `[CRITICAL_FAILURE]`, `[ACTION_REQUIRED]`).
- **Why**: Silent failures in long logs are easily missed by AI agents. Explicit error reporting forces immediate attention and prevents broken assets from entering the production build.

- **Pixel Art**: The script uses lossless WebP to preserve pixel-perfect clarity.
- **Large Assets**: Use lossy WebP (Quality 80) for maximum compression.

### 3. Unified Asset Management (AssetService)

To ensure consistent asset pathing, dynamic source routing (PokeAPI/Showdown), and automatic LOD (Level of Detail) support, all image requests **MUST** pass through the `AssetService`.

- **MANDATORY**: Use `getAssetUrl(type, id, options)` from `@/logic/services/assetService`.
- **FORBIDDEN**: Hardcoding `https://...` URLs or manual `new URL('/assets/...')` in components or logic.
- **LOD Support**: The service automatically integrates with the `assetResolver` to serve reduced-resolution assets (`@0.5x`, `@0.25x`) on mobile or low-end devices.
- **Reactive Resolution**: The system **MUST** handle viewport resizing reactively. The `AssetResolver` listens to `resize` events to swap assets dynamically without requiring a manual page refresh.
- **Zero-Fugitive Policy**: NO local images (e.g. background wallpapers, NPC portraits) should be referenced directly via static paths. Always resolve them through the AssetService. In Vue, use `v-bind` in CSS (e.g. `background: v-bind(wallpaperUrl)`) or in templates.

- **Reference**: See [references/asset_service_manual.md](./references/asset_service_manual.md) for usage examples, asset types, and mapping rules.

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
- **Global Debugging Bridge**: To facilitate runtime auditing of textures, memory, and engine state, the `phaserBridge` **MUST** be exposed to the global `window` object in the development environment. Use `window.phaserBridge.game.textures.list` in the console to verify asset loading.

## Modularization & File Length Standards

To maintain a healthy, readable codebase, we follow a strict **Modularization Policy**. High-density files are difficult for agents to process reliably and are prone to logic errors.

### 1. The 500-Line Rule

Any `.vue`, `.js`, or `.scss` file inside the project **MUST NOT** exceed 500 lines, with the following **MANDATORY EXCEPTIONS**:

- **External Dependencies & Legacy Backups**: Files in `node_modules/` or `backup_legacy_code/`.
- **Data-Heavy Definition Files ("Pseudo-Databases")**: Files used strictly for data storage/definitions that are not yet in Supabase/SQLite (e.g., `schedules`, `conflict routes`, `game constants`, `coordinate maps`, `migrations_data.js`).
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
  - **Nesting Safety**: When refactoring or moving SCSS blocks, ALWAYS verify that `@media` queries or nested rules are properly closed. Orphaned blocks cause build-breaking syntax errors (`expected "{"`).
  - **Relative Pathing**: When importing SASS partials/mixins from components in nested directories (e.g., `src/components/map/`), always use relative paths from the component's perspective (e.g., `../../styles/core/mixins`) rather than assuming a root-relative path or a single-level jump.
  - **Scroll Inheritance (Flexbox/Grid)**: To ensure internal `overflow-y: auto` works in nested layouts, every flex parent in the hierarchy **MUST** have `min-height: 0` (or a fixed height). This allows the child to shrink below its content's natural size and trigger scrollbars. Alternatively, use `position: absolute; inset: 0` within a relative parent for maximum stability.

- **Logic (JS)**:
  - Extract utility functions to `src/logic/utils/`.
  - Use modular classes or function sets instead of monolithic bridges.

## Full Vue & Hybrid Code Standards

To ensure the application remains stable and 100% reactive, we maintain a strict policy against "hybrid" DOM manipulation.

### 1. Mandatory Pure Vue

- **FORBIDDEN**: Using `document.querySelector`, `document.getElementById`, or any direct DOM query for UI elements that are managed by Vue.
- **FORBIDDEN**: Imperative DOM manipulation (`document.createElement`, `innerHTML`, `appendChild`, `remove()`).
- **REQUIRED**: All UI state must be managed via Vue templates, reactivity (refs/reactive), or Pinia stores.
- **EXCEPTION**: Accessing the Phaser canvas container (`#game-container`) or specific non-Vue root elements is allowed only inside the `phaserBridge` or dedicated low-level services.

### 2. Lifecycle & Global Listeners

- **REQUIRED**: Any event listener added to `window` or `document` (scroll, resize, click) **MUST** be added inside `onMounted` and removed inside `onUnmounted` to prevent memory leaks and unexpected side effects.
- **FORBIDDEN**: Manipulating `document.body.classList` manually. Use a centralized watcher in `App.vue` or a global Pinia state to bind body classes reactively.

### 3. Hybrid Pattern Detection

- **MANDATORY**: You **MUST** run the detection script after any logic or UI modification to ensure no legacy hybrid patterns were introduced.
- **Execution (Full Project)**: `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py`
- **Execution (Targeted)**: `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py src/components/battle/` or `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py src/App.vue`

## Styling & Aesthetic Standards: Hybrid Retro-Modern Mandate

To maintain a unique, high-end visual identity, the project follows a **Hybrid Retro-Modern** aesthetic. We prioritize a deliberate contrast between modern, sleek UI shells and classic, pixel-perfect content.

### 1. The Hybrid Mandate

- **Modern UI Shell (Containers & Layouts)**:
  - **REQUIRED**: Use state-of-the-art UI techniques for layouts, cards, and backgrounds.
  - **Techniques**: Glassmorphism (`-webkit-backdrop-filter: blur; backdrop-filter: blur;`), subtle HSL gradients, smooth shadows, and fluid transitions.
  - **Goal**: The "frame" must feel premium, modern, and reactive.
- **Pixel Art Content (The "Game Heart")**:
  - **MANDATORY**: All game-world elements **MUST** be Pixel Art. This includes **Sprites**, **Icons**, and **GAME TEXT** (Typography).
  - **FORBIDDEN**: Using modern high-res vector icons (SVG) or smooth modern fonts for primary game data/interaction.
  - **EXCEPTION: Premium Branding**: High-resolution logos, faction emblems, or specific premium UI decorations designed for high definition **SHOULD** use smooth rendering (`image-rendering: auto;`) to enhance the contrast with the pixelated heart.
  - **Asset Rendering**: Use `image-rendering: pixelated;` strictly for pixel-art elements. Use `@include smooth;` for premium branding exceptions.

### 3. Pixel-Perfect Typography (Sharpness Mandate)

To prevent blurriness and maintain the retro heart's integrity, all pixel fonts must be rendered with absolute sharpness, bypassing modern antialiasing.

- **MANDATORY**: Any text component using pixelated fonts (e.g., 'Press Start 2P', 'Silkscreen', 'VT323') **MUST** disable font smoothing.
- **Implementation**: Use `@include pixelated;` in SCSS. This mixin forces `-webkit-font-smoothing: none`, `-moz-osx-font-smoothing: grayscale`, and hardware acceleration (`transform: translateZ(0)`) to ensure characters are snapped to the pixel grid.
- **Why**: Pixel fonts rely on sharp edges. Modern antialiasing makes them appear "fuzzy" or "dirty," violating the project's visual core.
- **FORBIDDEN**: Relying on default browser antialiasing for game-world text. Blurry typography is considered a violation of the Hybrid Retro-Modern identity.
- **Text-Shadow Standards**: To maintain sharpness, `text-shadow` for pixel fonts **MUST NOT** use blur radius. Use hard offsets (e.g., `2px 2px 0px rgba(0,0,0,0.5)`).
- **Audit Mandate**: If a user reports "blurry" or "compacted" UI, first audit for missing `min-height: 0` on flex parents or legacy CSS padding overrides in `_modals.scss`.

### 4. Safari Compatibility (Prefix Mandate)

- **REQUIRED**: Any usage of `backdrop-filter` **MUST** be preceded by `-webkit-backdrop-filter` to ensure compatibility with Safari and Safari on iOS. Failure to do so is considered a critical UI regression.

### 5. Premium HUD Glassmorphism Standards

To ensure a cohesive and high-end feel across all HUD elements, follow these specific slate-blue glassmorphism tokens:

- **HUD Headers/Containers**: Use `@include glass-solid(rgba(13, 17, 23, 1))`. This ensures a solid, readable base that remains distinguishable from the game world without the performance cost of real-time blur.
- **HUD Buttons & Sub-elements**: Use `@include glass-solid(rgba(13, 17, 23, 0.9))`.
- **Borders**: Always use a subtle `1px solid rgba(255, 255, 255, 0.15)` to define edges and maintain the premium aesthetic.

### 6. Readability Standards for Articles & Documents

To ensure content-heavy modules (Library, Wiki, Mission Briefs) remain readable across devices:

- **Max-Width**: Text-based articles **MUST** have a maximum width of `1000px` (not 720px) to balance focus and whitespace usage.
- **Padding**: Use `32px` internal padding for the main article content to maximize screen utility while maintaining safe zones.

## UI Interaction & Modal Standards

To ensure a seamless and predictable user experience, all dialogs, modals, and interaction prompts must follow a strict **Interaction Stack** behavior.

### 1. The Interaction Stack (LIFO) Mandate

- **REQUIRED**: Any "window", "modal", or stack of user interactions/questions **MUST** behave as a strict **STACK** (Last-In-First-Out).
- **Behavior**: The most recently opened interaction (the last one to enter visibility) is the **first** one that must be closed, accepted, or resolved.
- **Stacking Context (Hardware Acceleration)**:
  - **MANDATORY**: Any component using `<Teleport to="body">` and containing `fixed` children (like an overlay and a card) **MUST** apply `transform: translateZ(0);` (or a hardware-accelerated transform) to the main wrapper.
  - **Why**: This forces the browser to create a new local stacking context. This prevents internal z-indices (e.g., Overlay: 1, Card: 2) from being overridden by high-magnitude global styles (e.g., legacy styles with z-index: 11000).
- **FORBIDDEN**: A new interaction, window, or modal must **NEVER** open behind an already existing one.
- **Test Mandate**: You **MUST** ensure this stack-based behavior is verified with **Unit Tests** for any modal manager, window component, or UI layering system.

### 2. Interaction in Locked States (Teleport & Allowlist)

When the game engine (Phaser) is in a "Locked" state (e.g., during complex animations or when inputs are globally captured), UI overlays **MUST** remain functional.

- **Mandatory Teleport**: Use Vue's `<Teleport to="body">` for all global modals to ensure they exist outside the main game view's event-capture hierarchy.
- **Background Interaction (Overlay: None)**:
  - **REQUIRED**: When a modal is configured with no overlay (`overlay="none"`), the main wrapper **MUST** have `pointer-events: none` while the modal card retains `pointer-events: auto`.
  - **Why**: This allows the user to scroll the game world or click on background HUD elements while the side panel remains visible.
- **Allowlist Mandate**: Interactive elements that must remain clickable during a lock **MUST** be added to the project's global interaction allowlist (e.g., the `.modal-scrollable-content` class in `App.vue`).

### 3. Notification & Toast Standards (Highest Layer Mandate)

To ensure that critical system feedback (success, errors, or insufficient funds) is never missed by the user:

- **MANDATORY**: Toast notifications **MUST** occupy the highest possible stacking layer.
- **Implementation**: Set the `z-index` of the notification stack to **999,999**.
- **Why**: High-priority modals (like Faction Choice) often use elevated `z-indices` (e.g., 13000) to ensure they sit above side panels. Toasts must remain visible on top of these modals to provide context for interaction failures.

## Database & Context Architecture

All database interactions **MUST** go through the **Unified DB Router** to ensure seamless online/offline routing and absolute data isolation.

- **FORBIDDEN**: Direct calls to `supabase.from()`, `sqlDb.run()`, or any specific provider adapter inside UI components or feature services.
- **Principle**: The DBRouter contextually routes requests to Global (Supabase) or Local (SQLite) instances based on the session.
- **Reference**: See [references/dbrouter_manual.md](./references/dbrouter_manual.md) for context routing logic, the ProxyQuery pattern, and implementation examples.

### Modular Import Mandate

- **REQUIRED**: All database interactions **MUST** use modular imports from `@/logic/db/dbRouter`.
- **FORBIDDEN**: Accessing the database via `window.DBRouter`. This is part of the final Vue 3 migration to eliminate global namespace pollution.

### Strict Server & Session Isolation

The application **MUST** maintain absolute isolation between server contexts. A session initiated in one context (Global/Online) **MUST NEVER** bridge data or world-states with another (Local).

- **Reference**: See the "Isolation Mandate" section in [references/dbrouter_manual.md](./references/dbrouter_manual.md) for definitions of Global vs. Local world-states.

### Database Schema & Migration Mandate

Strict versioned migration patterns are mandatory. You **MUST** maintain **Triple Sincronización** parity for every schema change across three locations:

1. **SQL Migration**: A timestamped file in `database/migrations/` (e.g., `YYYYMMDDHHMMSS_description.sql`).
2. **Automated Parity**: The logic layer is synchronized automatically via the **Vite Migration Plugin**, which generates `src/logic/db/migrations_data.js`. Manual updates to this array are **FORBIDDEN**.
3. **Absolute Schemas**: The corresponding table definition(s) updated in `database/schemas/` to reflect the new state.

- **Automated Source of Truth**: We maintain timestamped deltas (migrations) as the primary source. The Vite plugin ensures the JS layer (SQLite) matches these files on every save.
- **Remote Transparency**: You **MUST** always provide the user with the exact SQL code to be executed in the remote database (Supabase) for every schema change.
- **Reference**: See [references/dbrouter_manual.md](./references/dbrouter_manual.md) for naming conventions and the migration workflow.

### Database Compatibility & Migration Version Mandate

To prevent data corruption and ensure security, the application enforces strict versioning between the game client and the database based on applied migrations.

- **Mandatory Version Table**: Every database (Supabase/SQLite) **MUST** have a `system_config` (online) or `config` (offline) table with a `db_version` entry.
- **Client Guard**: The client defines a `CLIENT_DB_VERSION` (a numeric timestamp). If `CLIENT_DB_VERSION > DB_VERSION`, the app **MUST** block access and notify the administrator.
- **Migration Version Mandate**: Every SQL migration file **MUST** conclude with a statement that **sets** the `db_version` to the migration's unique timestamp ID.
  - **Supabase (JSONB)**: `UPDATE public.system_config SET value = jsonb_build_object('db_version', 'YYYYMMDDHHMMSS') WHERE key = 'db_version';`
  - **SQLite (TEXT)**: `UPDATE config SET value = 'YYYYMMDDHHMMSS' WHERE key = 'db_version';`
- **Triple Synchronization (Fully Automated)**: Every time a migration is added, the Vite plugin regenerates the data and the `CLIENT_DB_VERSION` in `dbRouter.js` is automatically updated to match the timestamp ID of the latest migration. No manual code updates are required.

### Database Dialect Compatibility & Translation Mandate

To ensure seamless offline functionality, the application MUST automatically translate PostgreSQL-specific migrations into SQLite-compliant syntax. Failure to handle dialect differences causes critical initialization crashes.

- **MANDATORY**: All migrations MUST pass through the `translatePostgresToSqlite` engine and be split using `splitSQLStatements`.
- **Logic Skipping**: The engine MUST automatically skip Postgres-only blocks (Functions, Policies, Triggers).
- **Mandatory Testing**: Any new SQL pattern MUST be added to the unit test suite in `tests/unit/db_translation.spec.js`.
- **Reference**: See [references/db_translation_manual.md](./references/db_translation_manual.md) for the complete list of translation rules, type mappings, and SQLite limitations.

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
  - `unquote(...)` -> `string.unquote(...)` (Must add `@use "sass:string";` to the block)
  - `scale(...)` -> `Scale(...)` (Capitalize to bypass SASS color function collision. **WARNING**: SASS will throw `$color: 1.02 is not a color` if lowercase is used with unitless numbers in transforms.)
  - `grayscale(...)` -> `Grayscale(...)` (Capitalize to bypass SASS color function collision)
  - `invert(...)` -> `Invert(...)` (Capitalize to bypass SASS color function collision)
  - `opacity(...)` -> `Opacity(...)` (Capitalize to bypass SASS color function collision)
  - `unit(...)` -> `math.unit(...)`
  - `percentage(...)` -> `math.percentage(...)`
  - `abs(...)` -> `math.abs(...)`
  - `round(...)` -> `math.round(...)`
  - `ceil(...)` -> `math.ceil(...)`
  - `floor(...)` -> `math.floor(...)`

### 3. Automatic Validation

- **MANDATORY**: You **MUST** run the following validation scripts after any UI or logic modification:
  - **SASS Traps**: `python3 .agents/skills/project-standards/scripts/check_sass_traps.py`
  - **Hybrid Patterns**: `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py`

## Python Dependency & Skill Script Standards

To ensure that Python-based automation scripts within skills are reliable and self-healing for AI agents, the following standards are mandatory.

### 1. Robust Import Wrappers (Self-Healing Mandate)

- **MANDATORY**: Every Python script located within a skill's `scripts/` directory **MUST** wrap all imports (including standard libraries to maintain consistency) in a `try/except ImportError` block.
- **Recognizable Error Format**: The error message printed in the `except` block **MUST** include the tag `[PYTHON_DEPENDENCY_ERROR]` to allow AI agents to instantly identify and fix the missing dependency.
- **Implementation Pattern**:

  ```python
  try:
      import some_library
  except ImportError:
      print("[PYTHON_DEPENDENCY_ERROR] Missing library: some_package. Run 'pip install some_package' to fix.")
      import sys
      sys.exit(1)
  ```
  
- **Why**: This allows the AI agent to immediately understand a script failure as a fixable dependency issue rather than a logic bug, enabling self-healing workflows.

### 2. Centralized Dependency Tracking

- **MANDATORY**: Any external Python library required by a skill script **MUST** be added to the project's root `requirements.txt`.
- **Validation**: Before finishing a task involving Python scripts, you **MUST** ensure `requirements.txt` reflects all necessary packages.

## Dev Server Management

To avoid port conflicts and resource waste, we must ensure only one instance of the development server is running.

- **Instance Detection**: Always check for running `vite` processes before executing `npm run dev`.
- **Reuse Policy**: If an instance is already running (usually on port 5173 or 5174), reuse it instead of starting a new one.
- **Error Monitoring**: If a development server is active (typically in a terminal named `npm`), you **MUST** check its terminal output (buffer) using `command_status` to identify the most recent runtime errors or warnings. Static linting (`npm run lint`) captures codebase-wide issues, but the active dev terminal captures the "freshest" errors occurring during live execution.

## Workflow

### 1. File Length Audit

Before finalizing, verify that no touched files violate the length standard:

```bash
# In Bash-like environments:
find . -maxdepth 4 -type f \( -name "*.vue" -o -name "*.js" -o -name "*.scss" \) -not -path "./node_modules/*" -not -path "./.agents/*" -not -path "./backup_legacy_code/*" -not -path "./dist/*" -not -name "migrations_data.js" -exec wc -l {} + | awk '$1 > 500 && $2 != "total"'

# In PowerShell:
Get-ChildItem -Recurse -File -Include *.vue, *.js, *.scss | Where-Object { $_.FullName -notmatch "node_modules|\.agents|backup_legacy_code|dist|migrations_data\.js" } | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 500) { "$lines`t$($_.FullName)" } }
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
- **Dev Terminal Errors**: If the active dev server terminal shows errors, prioritize fixing them as they represent the current state of the application in motion.
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
7. `[ ]` **DB Translation**: Verified that all Postgres migrations are translated via the intelligent engine and new patterns have unit tests.
8. `[ ]` **Python Deps**: `pip install -r requirements.txt` executed/verified.
9. `[ ]` **SASS Protection**: Running `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` returns success.
10. `[ ]` **Full Vue Check**: Running `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py` returns success.
11. `[ ]` **Hybrid Retro-Modern**: Verified Modern UI frames vs. Pixel Art content heart (@/references/sass_styling_manual.md).
12. `[ ]` Dev Server Check: No duplicate instances or reused existing one.
13. `[ ]` **Dev Server Logs**: Active terminal buffer (typically named `npm`) checked for recent runtime errors or warnings.
