---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500/1000-line modularity (SRP focus), Zero-Warning SASS/Vue standards, input standardization, financial layouts, and Zero-Ignore TypeScript policy. Strictly prohibits the use of timers (setTimeout) or reactive state variables for animation coordination in favor of GSAP timelines and promises. Includes diagnostic scripts for automated auditing (viewport, GPU, items). For ANY task involving the battle engine or FSM transitions, you MUST use validate_fsm_diagrams.ts, validate_fsm_implementation.ts, and validate_fsm_flow_parity.ts to ensure 1:1 parity with documentation and zero race conditions. Acts as a Navigation Hub to access technical manuals.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals to ensure a lightweight and effective rule base.

- **MANUAL PUSH MANDATE**: You are FORBIDDEN from executing `git push`. You MUST inform the user that the local repository is clean and updated, and they should perform the push manually when ready.
- **Zero Audit Failures**: The project is now fully migrated. Under NO circumstances are audit failures (SASS, Aesthetics, Length, FSM, Types, Lint) allowed in any commit. Every single commit must be 100% clean and compliant with the validation pipeline.

## 🧭 Navigation Hub

Consult these manuals for detailed implementation specifications:

| Domain                   | Reference Manual                                                                          |
| :----------------------- | :---------------------------------------------------------------------------------------- |
| **Content Creation**     | [content_creation_manual.md](./references/content/content_creation_manual.md)             |
| **Battle Mechanics**     | [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md)              |
| **Mechanics & UX**       | [game_mechanics_manual.md](./references/core/game_mechanics_manual.md)                    |
| **UI/UX Standards**      | [ui_ux_standards.md](./references/core/ui_ux_standards.md)                                |
| **Formulas & Ratios**    | [game_formulas_manual.md](./references/core/game_formulas_manual.md)                      |
| **Time & Seasons**       | [time_system_manual.md](./references/core/time_system_manual.md)                          |
| **Node 26+ Standards**   | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |
| **Breeding (Daycare)**   | [breeding_manual.md](./references/systems/breeding_manual.md)                             |
| **Evolution System**     | [evolution_manual.md](./references/systems/evolution_manual.md)                           |
| **Encounter Systems**    | [encounter_manual.md](./references/systems/encounter_manual.md)                           |
| **Item System**          | [item_system_manual.md](./references/systems/item_system_manual.md)                       |
| **War & Factions**       | [war_system_manual.md](./references/systems/war_system_manual.md)                         |
| **Gyms & Rematch**       | [gym_system_manual.md](./references/systems/gym_system_manual.md)                         |
| **Social & Trade**       | [trade_social_manual.md](./references/systems/trade_social_manual.md)                     |
| **DB Architecture**      | [dbrouter_manual.md](./references/technical/dbrouter_manual.md)                           |
| **Validation & Quality** | [validation_manual.md](./references/qa/validation_manual.md)                              |
| **Save & Persistence**   | [save_system_manual.md](./references/technical/save_system_manual.md)                     |
| **Testing & Simulation** | [browser_testing_manual.md](./references/qa/browser_testing_manual.md)                    |
| **Animations & FX**      | [animation_standards.md](./references/battle/animation_standards.md)                      |
| **GPU & Performance**    | [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md)           |
| **Low Power Mode**       | [low_power_mode_manual.md](./references/technical/low_power_mode_manual.md)               |
| **SASS & Styling**       | [sass_styling_manual.md](./references/technical/sass_styling_manual.md)                   |
| **Asset Pipeline**       | [asset_service_manual.md](./references/technical/asset_service_manual.md)                 |
| **Map & Spawns**         | [spawn_grid_manual.md](./references/systems/spawn_grid_manual.md)                         |
| **Combat Camera**        | [combat_camera_manual.md](./references/battle/combat_camera_manual.md)                    |
| **Dependencies**         | [dependency_management_manual.md](./references/technical/dependency_management_manual.md) |
| **MikroTik & Ruteo**     | [mikrotik_routing_manual.md](./references/technical/mikrotik_routing_manual.md)           |
| **Markdown & Docs**      | [markdown_standards.md](./references/technical/markdown_standards.md)                     |

### 🛠️ Migration & Technical Support

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/migration/legacy_migration_manual.md)
- **DB Technical Notes**: [references/migration/](./references/migration/)
- **SQLite Migration PL/pgSQL Sanitization**: Client-side SQLite WASM engines do not support PG PL/pgSQL constructs like `DROP FUNCTION` or `CREATE FUNCTION`. The SQL translator MUST intercept and strip these statements (e.g. in `sqlTranslator.ts`) to allow seamless offline schema upgrades.

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: High-contrast solid backgrounds, premium gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements (sprites, items, badges) MUST use `@include pixelated`. This mixin handles browser fallbacks and typography sharpening. Typography for stats and headers must always be pixelated.
- **Overlapping Sprite Stacking (Cards Deck)**: In retro-modern flex lists or reward displays, use negative margins (e.g. `margin-left: -16px` on sibling `.item-sprite` elements) to create a high-density, overlapping deck structure. Accompany this with a smooth hover micro-animation using GSAP transitions or CSS `:hover` that slightly scales (`scale(1.2)`), lifts (`translateY(-4px)`), and elevates the z-index (`z-index: 10`) of the targeted sprite to provide premium tactile feedback.
- **Retro Font Layout Clipping Prevention**: When styling pixelated text elements utilizing custom fonts like `Press Start 2P` in containers with `overflow: hidden`, you MUST set `line-height` to at least `1.5` or `1.6` and add a slight `padding-top` (e.g. `1px` or `2px`). This ensures that the browser does not clip or distort the top of numerical characters or labels.
- **Pixel-Art Container Backgrounds (`background-image`)**: To prevent the browser from applying bilinear smoothing to pixel-art assets loaded as CSS backgrounds on `div` containers, you MUST apply `image-rendering: pixelated` (along with `crisp-edges` and `-webkit-optimize-contrast`) directly to the container style.
- **Maquetación y Detalles UI**: Las reglas específicas de maquetación (como alineaciones de Emojis en Windows, overrides de dropdowns select, y reglas de CSS Grid) han sido modularizadas en [ui_ux_standards.md](./references/core/ui_ux_standards.md).

### 2. GPU & Rendering

- **GPU First**: Prioritize hardware-accelerated rendering. See [gpu_optimization_manual.md](./references/technical/gpu_optimization_manual.md). GPU promotion (`will-change`) MUST be context-aware; only add it if a `filter` or `transform` is present and no other `will-change` exists within the same block (500-character window) to avoid redundancy and memory overhead.
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel (UPR/OVR)**: All atmospheric effects MUST use the **Universal Parallax Rule** (seed-based CSS transforms) and the **Organic Variability Rule** (randomized GSAP speeds via `animSeed`). This ensures that no two maps have the same visual weather rhythm.
- **VFX Integrity**: To avoid visual contamination, status effects (Burn, Poison, etc.) MUST override persistent auras (Guardian, Shiny) instead of being superimposed. Use mutually exclusive `if/else if` chains in FX logic.
- **GSAP Filter Order**: When animating multiple filters in `PVSpriteFX`, the application order matters. Lighting filters (`Brightness`, `Contrast`) MUST be applied BEFORE outline or glow filters (`feMorphology`, `Drop-Shadow`) to prevent the effect from becoming washed out or losing sharpness.
- **Organic Terrain Variation**: Combat terrain (`CombatGrass.vue`) MUST be unique for every encounter. A new random seed MUST be generated at the start of each battle to inject variations in scale (0.7x to 1.5x), horizontal flip, and small offsets, avoiding monotonous visual repetition.
- **Tactical Status Standardization**: Tactical states (Protect, Endure, etc.) MUST be represented by unique, solid, high-visibility icons. Avoid using multiple dispersed particles for tactical states, as those are strictly reserved for altered statuses (Burn, Poison, etc.).
- **GSAP Exclusive Mandate**: All animations in the project (UI transitions, battle effects, map movements, atmospheric FX) MUST be implemented using GSAP. The use of CSS `@keyframes`, transitions, or `setTimeout`/`setInterval` for animation flow is STRICTLY FORBIDDEN. Refer to [animation_standards.md](./references/battle/animation_standards.md) for details on CSS clashing, GPU shines, and filter cleanups.
- **Zero-Timer & Zero-Variable Policy**: It is STRICTLY FORBIDDEN to use `setTimeout` or numeric timers to wait for visual completion. Sequential animation coordination MUST NOT be handled via reactive state variables (e.g., boolean flags or counters). You MUST use GSAP's native deterministic orchestration: timelines, promises (`await tween`), or `onComplete` callbacks. For recurring UI updates or clocks, use recursive `gsap.delayedCall` loops instead of `setInterval` and clean them up during unmount (`onUnmounted`).
- **Zero Heavy Logic in Vue Templates**: Accessing databases, data providers (e.g., `DBRouter`, `pokemonDataProvider`, `sqlite`, `supabase`), or executing heavy transformations (`.map`, `.filter`, `.reduce`) inside `<template>` expressions or bindings is strictly prohibited. All UI data must be resolved in `<script>` and cached using reactive `computed` properties.
- **Zero Serialization in Watchers**: Do not use `JSON.stringify` inside watch handlers. High-frequency watchers carrying serialization overhead saturate the CPU and cause severe frame drops.
- **IntersectionObserver Root Rule**: Always use `root: null` or omit the `root` property when defining an `IntersectionObserver` inside zoomed or scaled views (e.g., `#zoomable-content`). Declaring a custom element as root under CSS transforms causes faulty visibility calculations, failing to trigger visible elements and freezing active animations.
- **UI Tab Integrity**: To prevent unwanted vertical scroll indicators (arrows) in horizontal tab bars with `overflow-x: auto`, you MUST apply `overflow-y: hidden` and `flex-shrink: 0`. This avoids layout calculation errors caused by vertical padding or sub-pixel overflow.
- **Interface Zoom Restrictions on Canvas Viewports**: Do NOT apply CSS `zoom` or scale transforms to elements rendering a game canvas (like Phaser's `.battle-arena`), as it distorts pointer coordinate mapping and camera calculations. Apply the zoom factor (`--app-zoom`) selectively to UI sidebars/panels (e.g. chat log, action panels) and dynamically scale grid layouts using calculation variables (e.g. `calc(320px * var(--app-zoom, 1))`).
- **Tooltip Scale & Boundary Adaptability**: When using teleported tooltips under a zoomed/scaled view, do not scale the parent `.pv-tooltip-teleported` as it breaks absolute positioning calculations. Instead, apply the scale transform to the inner animation wrapper (`.tooltip-animate-wrapper`) and scale the parent's `min-width`/`max-width` limits proportionally with the zoom factor to prevent text wrapping or layout clipping.
- **Deterministic Orchestration**: Visual sequences MUST return a Promise (using `awaitAnimation` or GSAP timelines) so the state machine can synchronize state changes with visual completion.
- **GSAP for Progress Indicators**: Do not use manual CSS `transition:` definitions to animate progress bars. Instead, use a reactive ref observed via a Vue watch handler paired with GSAP (`gsap.to`) to animate progress values smoothly and deterministically.
- **CLI-Ready Visuals**: Every animation MUST be triggerable via `window.__VITE_DEBUG__.battle.animations` (or the corresponding debug bridge) to allow headless verification.

### 3. Modularity & Hierarchy

- **500/1000-Line Rule**: Modularization is recommended for files exceeding **500 lines** (triggers a quality warning). No logic or style file may exceed **1000 lines** (hard limit, exceeding is a critical error). This limit is calculated based on logical lines of code (SLOC), completely ignoring comments (`//`, `/* */`, `<!-- -->`) and blank lines.
  - _Exemption_: Massive databases, metadata files (`*Metadata.ts`, `*DB.ts`), and modules in `src/data/` are exempt to maintain data cohesion.
  - **Visual Configuration Extraction**: When modularizing massive visual components (Partículas, Auras) to comply with this rule, extract data dictionaries and configuration objects into external `.ts` files (e.g., `fx-configs.ts`) to keep the rendering logic clean.

- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Precomputed Database Mapping for Performance**: When designing dictionaries or lookup tables that map entities to multiple traits or dynamic arrays (such as dialogue quotes based on personality traits), pre-flatten and precompute these combined pools at module load time (storing them in a direct key-value hash map) instead of flattening or resolving them dynamically on every query. This provides O(1) lookup speed, matches the architecture of `POKEMON_FEET_DATABASE`, and prevents garbage collection overhead during hot paths.
- **Centralized Formatters**: All numeric formatting logic (currency, large numbers, suffixes) MUST be centralized in `src/logic/utils/formatters.ts`. Direct use of `toLocaleString()` in components for currency is deprecated in favor of `formatCurrency()`.
- **Combat Status Localization**: Names for altered status effects (BURN, POISON, etc.) MUST be centralized in the Spanish `STATUS_NAME_MAP` within combat utilities. The use of literal strings for status names in UI components is strictly forbidden.
- **Modal Lifecycle**: Synchronize performance mode with modal transitions.
- **Import Hygiene**: When implementing cross-component signals (e.g., calling `loadingStore` from a View), ALWAYS verify the import is present. Missing imports in lifecycle hooks (`onMounted`) are a primary cause of initialization deadlocks.
- **Engine Signaling (Loading Gate)**: Signal "App Mounted" only after the primary Vue views have finished mounting (`onMounted`). The loading veil MUST use `v-if` to be completely purged from the DOM after initialization, preventing blocking layers or performance issues.
- **Dynamic Viewport (Mobile)**: Use `dvh` units (e.g., `100dvh`) for full-screen containers to ensure the UI adapts correctly to mobile browser toolbars without clipping.
- **Decoupled FX (GameBus)**: Trigger non-critical visual effects or multi-component animations via `GameBus.emit()` to avoid direct component-to-component dependencies.
- **Pure Vue Compliance**: Avoid direct DOM/Canvas operations in Vue components. For mandatory performance-critical low-level code (e.g. Canvas generation) or long data structures, use the explicit ignore tags to satisfy the automated audit:
  - `// [PureVue-Ignore]`: Bypasses technical DOM/Window access checks.
  - `// [PureVue-Ignore-Length]`: Bypasses the 500-line limit for data-heavy files.
  - `// [PureVue-Ignore-Aesthetics]`: Bypasses hardcoded color/shadow audits for specialized FX or legacy styles.
- **Unitless Variable Pattern**: When passing coordinates or dynamic sizes from JS to CSS variables, ALWAYS use pure numeric values. Add units in CSS using `calc(var(--val) * 1px)`.
- **Zero Bridges Policy**: The use of `window.state` or any global compatibility bridge (`src/logic/bridges`) is forbidden. All communication must be handled via direct imports (ESM) and dependency injection through Pinia stores. Global state manipulation from the console must be reserved exclusively for `window.__VITE_DEBUG__`.
- **Strict Debug Isolation**: Debug tools, global window bindings (`window.__VITE_DEBUG__`), and HUD debug components must be strictly restricted to offline/local instances (`sessionMode === 'offline'`). In online mode, even users with an admin role are prohibited from initializing or accessing debug features to prevent potential server exploitation.
- **Modular Orchestration (HUD)**: High-complexity visibility logic, snapshots, and combat interface states MUST be extracted to dedicated composables (e.g., `useBattleHud.ts`). The arena view (`BattleArenaView.vue`) must act exclusively as a simplified visual orchestrator.
- **Reactive State Propagation**: When passing state subsets to external logic functions via `reactive({...})`, it is MANDATORY to include all control flags (e.g., `isFinishing`) to prevent the logic engine from making decisions based on incomplete or undefined states.
- **Grid-to-Card Sync**: In grid components (e.g., `MapGrid`), environment-dependent state (weather, cycle) must be calculated once and propagated to children via props (`forced-weather`). This avoids visual desynchronization between the data pool and the interface.
- **Robustness (Deterministic Environment)**: Treat `null` or undefined environmental states as triggers for deterministic calculation, ensuring that atmospheric content (visitors) injection is never skipped.
- **DBRouter Context Isolation**: Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts. Persistence logic migrations must strictly respect the `DBRouter` routing rules to prevent data pollution.
- **Atomic Batching**: Large migrations or refactors MUST be performed in atomic batches (single files or small logical groups) to manage context limits and ensure precision. Avoid directory-wide mass processing in a single step.
- **Pure Modules Pattern (Math Extraction)**: Core mathematical logic (battle formulas, weather cycles, stats calculation) MUST be extracted into standalone `*Math.ts` files. These modules must be "pure" (zero side effects, zero dependence on Vue/Pinia/Supabase). This allows using the high-performance Native Node.js Test Runner and ensures logic remains deterministic and portable.
- **CSS Variable Propagation**: When using CSS variables to pass dynamic states (like grade colors) from JS to CSS in a component, they MUST be injected via the `:style` attribute on the root element. Avoid using SFC `v-bind` in CSS for variables that need to be accessed by parent components or global overrides, as Vue generates internal unique variable names that break external inheritance.
- **Visual Identity (Zero-Stripping)**: Performance mode or simplified UI modes MUST NOT strip away the essential visual identity of game entities (e.g., Pokémon grade borders). Use CSS variables to maintain these markers consistently across all resource states.
- **Tier Identity Single Source of Truth**: All Pokémon grade logic, tier calculations, and color mappings MUST be centralized in the `tierEngine.ts` logic. Redundant constant files for tiers are strictly forbidden to prevent visual desynchronization.
- **Strict DB-to-UI Comparison**: When writing UI conditional logic or animations depending on database models (such as war factions), always compare against the official database string values in Spanish (e.g., `'poder'` instead of English `'power'`). Using incorrect literals causes animations and behaviors to fail silently.
- **English ID Logic Standard for Items**: For all logical checks, formulas, or data validations involving equipped items, ALWAYS compare against their standardized English database IDs (e.g., `'exp_share'`, `'everstone'`, `'destiny_knot'`, `'choice_band'`) since the sanitization system (`sanitizePokemon`) normalizes all equipped items to their ID representations. Spanish names (e.g., `"Compartir EXP"`) should be reserved strictly for visual UI rendering.
- **Barrel Re-export Modularization**: When visual or mathematical logic engines (such as `battleMath.ts`) exceed the strict 500-line limit, modularize them by extracting types, calculations, and rates into dedicated sub-files (e.g., `battleMathTypes.ts`, `damageMath.ts`, `catchMath.ts`) and use the main entrypoint as a barrel file to re-export them, maintaining full backward compatibility.
- **Move Description Fallback Chain**: Spanish translations for battle moves MUST implement a multi-layer fallback chain to avoid English leaks: first, query the `pokemonDataProvider` for official database/local translations; second, fall back to the local static `move_descriptions.json` translation dictionary; and third, use Showdown's `shortDesc` as a last-resort fallback.
- **Reactive Store Sanitization (Pokemon Switching)**: When switching active Pokémon entities in stores or views, you MUST sanitize their active moveset: auto-complete up to 4 moves with STAB guarantee, deduplicate moves using a `Set`, and filter out any empty or invalid entries.
- **Debug Tab Modularization**: When a debug tab component (e.g., `DebugTrainersTab.vue`) surpasses 300 lines because it embeds inline editing forms for a sub-entity (Pokémon, items), extract the editor into a dedicated child component (e.g., `IndividualPokemonEditor.vue`) that receives the target entity via a typed prop. This preserves SRP: the parent orchestrates state selection; the child handles the edit form. After extraction, simultaneously remove all now-unused imports and data from the parent to prevent `ReferenceError` at runtime and `TS6133` warnings at build time.arnings at build time.


### 4. SASS and Build Integrity

- **Unified SASS Trap Engine**: Capitalization of standard CSS/SASS functions (e.g., `scale`, `rotate`, `translate` -> `Scale()`, `Rotate()`, `Translate()`) is handled **automatically** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR (Hot Module Replacement) and build. Therefore, developers and agents can write standard lowercase CSS/SASS functions, and Vite will automatically format and capitalize them. No manual capitalization or standalone scripts are required.
- **Audit Exemptions**: Utility, maintenance, and migration scripts (located in `scripts/`) are EXEMPT from legacy code audits (e.g., `legacyDates`) to allow technical support tasks without false positives.
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`. It is MANDATORY to run `npm run lint` before presenting final changes to the user. If it's not zero, fix it and run the audit again.
- **Template Event Casting & Fallbacks**: When using strict TypeScript in `.vue` files, cast event targets in the template (e.g., `(e.target as HTMLImageElement)`) to satisfy `vue-tsc` checks. For dynamic assets that may not exist, always implement a graceful fallback handler like `@error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"` to cleanly hide missing items from the DOM and avoid raw broken image icons.
- **Dependency Shield**: Scripts using external libraries must handle `ImportError` and provide installation instructions.
  - **Node.js 26+ Native Standards**:
    - **Temporal API**: The legacy `Date` object is DEPRECATED for engine logic and timestamps. Use `Temporal` for all precise timing and durations. Refer to [dependency_management_manual.md](./references/technical/dependency_management_manual.md) for detailed guidelines on the Native-First polyfill structure, comparisons, coercions, and formatting.
    - **Map Upsert**: Use `Map.prototype.getOrInsertComputed` (or native patterns) for efficient cache lookups.
    - **Native Test Runner**: Use `node:test` for all pure logic unit tests (`npm run test:node`). This avoids the overhead of JSDOM/Vitest for non-UI logic.
    - **Dynamic Store Loading**: When writing logic code that is tested via the native test runner (`node:test`), avoid static imports of Vue/Pinia store modules. The native loader cannot resolve browser-specific ESM aliases (`@/`) or register Pinia contexts at import-time. Use dynamic imports protected by a `typeof window !== 'undefined'` check to bypass loading during tests.
    - **Structural Mocking**: When type-safety is required for dynamic/conditionally loaded store instances, do not use `any` (violates Zero-Any policy). Define a minimal local interface containing only the required methods to maintain type checking.
    - **Extension-First Imports**: When running tests or scripts via `node --experimental-strip-types`, all internal imports MUST include the `.ts` extension (e.g., `import { foo } from './bar.ts'`) to ensure resolution by the native loader. Note that the native Node.js test runner does not resolve `@/` path alias imports, so explicit relative paths with `.ts` extensions are strictly required.
    - **Permissions**: All maintenance scripts MUST adhere to the Node.js Permission Model (`--permission`). Utility scripts performing fetch/read/write must be restricted to their necessary scopes (e.g., `--allow-net`, `--allow-fs`).
    - **Resource Management**: Use the `using` keyword (Explicit Resource Management) for DB connections and file handles.
    - **Cross-Platform Path Standard**: For converting platform-specific filesystem paths (e.g., from `path.relative`) to POSIX format (such as browser URLs, assets keys, database indexes), you MUST use native split/join operations with separator tokens (`relPath.split(path.sep).join(path.posix.sep)`) instead of expressions or replace statements. This ensures that the generated output files (like JSON catalogs) remain identical and valid in browser environments across Windows, Linux, and macOS.
- **Vite Watcher EBUSY locking errors (Windows)**: When assets or images are generated dynamically in raw asset folders during local dev sessions, Windows processes (e.g. search indexer, antivirus scanner) may temporarily lock the newly created files. This causes Vite's FSWatcher to crash with an `EBUSY: resource busy or locked` error. To avoid server crashes, always exclude the raw assets folder (e.g. `_raw-assets`) inside the `server.watch.ignored` option of `vite.config.ts`.
- **Global Override Audit**: Global SCSS rules (especially in `src/styles/views/`) that use `!important` MUST be audited to ensure they do not sabotage component-level dynamic styling. Prefer using CSS variables for properties that change based on state to allow components to "own" their visual identity.

### 5. Integrity & Quality Enforcement

The project uses a sophisticated audit and validation engine to ensure stability and modern standards.

- **Mandatory Audit Pipeline**: Running `npm run audit:full` is MANDATORY before any commit or delivery. This pipeline orchestrates:
  - **Intelligent Audit (`audit:fix`)**: Automates SASS capitalization, GPU promotion, and Node 26+ syntax migration.
  - **SQL Parity (`validate:sql`)**: Validates migrations using native SQLite engines.
  - **Semantic Validation**: Synchronizes Moves, Abilities, and Items against PokeAPI/Official Data to prevent data drift.
  - **FSM Mastery (`validate:fsm`)**: Ensura 1:1 parity between battle logic and FSM documentation (diagrams, implementation, flow).
- **Zero-Warning Policy**: Zero errors and zero warnings are required for any core system component.
  - **Fallow False-Positive Security Bypass**: Local HTTP fetch requests (e.g., querying local `version.json` in `App.vue`) that trigger Fallow's security engine (CWE-918 / tainted-sink) must be resolved by placing the `// fallow-ignore-file security-sink` comment at the top of the Vue `<script>` setup block.
  - **Fallow Dupes Parsing Integrity**: Any automated audit parser script mapping Fallow's duplicate findings must support its updated JSON structure (`file` and `start_line` properties instead of `path` and `line`) to prevent runtime path resolution errors.
  - **Unused Import Prevention**: To satisfy strict TypeScript compiler checks (`vue-tsc --noEmit`), always prune unused imports (such as `ref`, `watch`) from Vue components after refactoring or extracting code blocks.
  - **Native TS Mandate**: The use of `tsx` or `ts-node` for running local utility scripts is STRICTLY PROHIBITED. All utility scripts and tests MUST run natively utilizing `node --experimental-strip-types` paired with Node.js 26+ sandboxed permissions flags.
  - **Module Prefix**: Use the `node:` prefix for all built-in module imports (e.g., `import fs from 'node:fs'`).
- **PWA Cache Reversion & Self-Healing**: To prevent browsers from serving cached, outdated versions of the application, the application MUST query a cache-busted `version.json` from the server on startup. If a client-side version mismatch (`client < server`) is detected, automatic or silent background updates and reloads are strictly forbidden. The system must block operations, present the warning card/dialog, and require the user to manually click "ACTUALIZAR AHORA" to programmatically unregister active service workers, purge cache storage, and force the reload using a cache-busting timestamp URL replacement (`window.location.replace`) to bypass aggressive HTTP disk caching of `index.html`.
- **Scratch Directory Mandate**: Any generated logs, text reports, summaries, or audit output files (regardless of file extension: `.txt`, `.log`, `.json`, etc.) created for review, debugging, or later study MUST be stored exclusively in the `scratch/` directory at the project root. Writing temporary report files, summaries, or logs in the project root, source directories, or any other arbitrary directory is strictly forbidden to preserve repository cleanliness.

### 6. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Verification Workflow**: For daily development, run `npm run lint` (which includes type-checking) to verify syntax and type safety. Running `npm run audit:full` is mandatory before any commit operation to ensure the repository remains unbroken.
- **SVG className Object Type-Safety**: SVG elements feature an `SVGAnimatedString` object for `.className` rather than a standard string. To prevent runtime type exceptions (e.g. `TypeError: className.includes is not a function`) during global event delegation, you MUST query `classList` (e.g. `el.classList.contains()`) or use array conversions (e.g. `Array.from(el.classList)`) instead of string-matching methods directly on `.className`.
- **JSDoc Integrity**: When editing code (especially via `multi_replace_file_content`), ALWAYS verify the preservation of the `/**` opening tags. Deleting these tags breaks JSDoc transformation in esbuild/vite and leads to documentation/type generation failures.
- **IDE & Workspace Config**: To ensure the IDE (like VS Code) applies the proper TypeScript program context and resolves development imports (e.g., `@vitejs/plugin-vue`) inside configuration files (e.g., `vite.config.ts`), these files must be explicitly declared in the root `tsconfig.json`'s `"include"` array.
- **Temporal API Typings**: For robust type-safety without using `any`, any custom or polyfilled Temporal API properties (e.g., accessing year/month/day/hour/minute on the return value of `toZonedDateTimeISO()`) must be explicitly declared with formal types (like `ZonedDateTime` interface/class) inside the global `env.d.ts` instead of typing them as `unknown` or `any`.
- **TypeScript Import Rigor**: Triple-slash references (e.g., `/// <reference types="vue" />`) are forbidden in `vite-env.d.ts` or any core file. Use standard ESM imports or `compilerOptions.types` in `tsconfig.json`.
- **Strict Typification in Test Scripts**: Scripts used for auditing (like `tests/node/*.test.ts`) and unit tests (`*.spec.ts`) MUST follow the same strict type-safety rules as the source code. The use of `any` is forbidden in all test files to prevent silent failures and maintain linter consistency. Instead of bypassing compilation with `any` (e.g. `as any`), declare a typed interface for your mocks (e.g., `interface DebugWindow`) and perform clean casts (e.g., `window as unknown as DebugWindow` or `'invalid_key' as unknown as TargetType`) to ensure absolute type-safety.
- **Generic Key Access Type-Safety**: To maintain strict type safety and avoid the use of `any` when dynamically accessing object properties in utility/helper functions, use TypeScript generic index constraints: `<K extends keyof T>(obj: T, key: K, fallback: T[K])` instead of casting the target object as `any`.
- **Strong Typing for External Tool Parsers**: When writing scripts or utilities that parse JSON outputs from external tools (such as Fallow, git, or compiler logs), you MUST define explicit TypeScript interfaces for the returned data structures instead of utilizing `any` or empty catch blocks. Catch block arguments should be typed as `unknown` and cast/assert explicitly to maintain compile-time checks under the Zero-Any policy.
- **Vue Template Typed Helpers (No `as any` in Templates)**: Never use `as any` inside Vue `<template>` expressions to access optional or legacy-shaped fields. Instead, extract typed helper functions in `<script setup>` that accept the correct typed argument (e.g., `NotificationItem`) and return safe values using `??` or conditional access. Example: `function getIcon(n: NotificationItem): string { return String(n.meta?.['icon'] ?? '🔔') }`. This ensures Zero-Any compliance without sacrificing runtime flexibility.
- **Explicit Error Propagation in Dynamic Imports**: When using dynamic `import(...).then(...).catch(...)` for lazy-loaded stores or modules, a silent `.catch(() => {})` is STRICTLY FORBIDDEN as it hides runtime failures and violates the no-fallback policy. Always re-throw with a descriptive message: `.catch((err: unknown) => { throw new Error('[context] Failed to ...: ' + String(err)) })`. This ensures errors surface in the browser console and are not silently discarded.

### 7. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states. It is MANDATORY to verify new content via CLI before committing.
- **Windows CLI Compatibility**: When chaining commands in PowerShell (default Windows CLI), avoid the `&&` operator; use `;` or run commands sequentially to ensure cross-platform stability.
- **Standardized Logging (HybridLogger)**: Consolidation of `HybridLogger` with context tags (e.g., `[Battle]`, `[GTS]`, `[Chat]`) is MANDATORY. This ensures "Zero-Log" production standards while maintaining CSS styling in browsers and ANSI in terminals. Direct `console.log` is FORBIDDEN in production-bound logic.

### 8. Z-Index, FSM & Low Power Governance

These specific technical rules have been moved to their respective specialized manuals:
- **Z-Index Layering**: Consolidado en [ui_ux_standards.md](./references/core/ui_ux_standards.md).
- **Battle Engine (FSM)**: Consolidado en [battle_mechanics_manual.md](./references/battle/battle_mechanics_manual.md).
- **Low Power Mode**: Consolidado en [low_power_mode_manual.md](./references/technical/low_power_mode_manual.md).

### Weather Anim Seed & GSAP Hover Animations
- **Weather Seed Synchronization**: The visual weather animation seed (0 to 1) MUST be synchronized between MapCard and BattleArenaView using the global `getWeatherAnimSeed` function. Pass it as `:anim-seed` to `<AtmosphereLayer>` (and never pass `:seed`).
- **File Length Bypass**: Large data-heavy or state-management files (like stores or factories) exceeding 500 lines by design but under 1000 lines MUST carry `// [PureVue-Ignore-Length]` at the top of the script setup block. Note that Vue components and logic files are strictly prohibited from using this bypass to exceed 1000 lines.
- **Strict GSAP Hover animations**: All hover transitions on interactive cards or rows (such as lift, scale, or background transition) MUST be handled via `@mouseenter` and `@mouseleave` handlers using GSAP (`gsap.to`), completely avoiding manual CSS `transition:` declarations.


---

## 🏗️ Artifact Governance (MANDATORY)

To ensure rigor and traceability, every complex task MUST follow the artifact lifecycle:

1. **Planning**: Create `implementation_plan.md`. Wait for "ok" from the user.
2. **Execution**: Maintain `task.md` as the source of truth.
3. **Closure**: Create `walkthrough.md` with evidence (screenshots, test logs) of task success.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **Architectural Reuse**: Have I reused existing components?
- [ ] **GPU Acceleration**: Have I applied layer promotion on heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated and sharp?
- [ ] **CLI-First**: Have I verified the state via console?
- [ ] **Zero-Warning**: Do `npm run lint` and `build` pass without warnings?

## 📊 Diagnostic Tools & Reference

All validation, testing, and multi-server setup scripts (`validate:*`, `audit:*`, `supabase:manage`) have been consolidated. Refer to [validation_manual.md](./references/qa/validation_manual.md) for the complete command reference table.
