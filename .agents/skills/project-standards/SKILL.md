---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, and Zero-Warning SASS/Vue standards. Use this as a Navigation Hub to access technical manuals for Phaser, Database, and Assets.
---

# Project Standards (Lean Core)

This skill governs the project's DNA. Technical implementation details are delegated to specialized manuals to ensure a "Lean" and effective primary ruleset.

## 🧭 Navigation Hub

Refer to these manuals for complex implementation specifications:

| Domain | Manual |
| :--- | :--- |
| **Phaser & Rendering** | [phaser_guidelines.md](./references/phaser_guidelines.md) |
| **UI/UX & Aesthetics** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **SASS Styling** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Database Architecture** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Sync & Security** | [security_and_sync_manual.md](./references/security_and_sync_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |
| **Map & Spawns** | [spawn_grid_manual.md](./references/spawn_grid_manual.md) |

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern UI Shell**: Use premium CSS (Glassmorphism, gradients) for layouts and containers.
- **Retro Heart**: Use Pixel Art and Sharp Typography for all game-world content and data.
- **UI Variants**: Leverage `BaseModal` variants (`modern` vs `retro`) to match the context. Gameplay/Config = `retro` (yellow border). Shell/Web = `modern`.
- **UI Logic**: Always use parameterized props (`hide-header`, `variant`) instead of ad-hoc style overrides.
- **Discovery States (Fog of War)**: Implement standard discovery states across all UI:
  - **Unknown**: `?` placeholder, `???` label, 0.7 opacity, brighter question mark.
  - **Seen (Not Caught)**: Silhouette (`filter: Brightness(0)`), 0.45 opacity, name visible. Add a subtle `Drop-shadow(0 0 1px rgba(255,255,255,0.2))` to the silhouette to define its outline against dark backgrounds.
  - **Caught**: Full color, 1.0 opacity.
- **Unified Type Pill System**: All elemental indicators (moves, pokemon types, gym badges) MUST use the master class `.m-type-tag`.
  - **Centralized Style**: Do not define local type styles. Always use the global `_type-pills.scss` module.
  - **High-Contrast Outlines**: Type labels MUST use a 4-directional `text-shadow` (e.g. `1px 1px 0`, `-1px -1px 0`) with 0 blur to maintain sharp pixel-perfect legibility against colorful pill backgrounds.
- **Visual Error Handling**: Every game content image (`<img>`) MUST implement an `@error` fallback. Hide the broken image and display a generic CSS-styled placeholder (e.g., a div with `👤`) to maintain a premium aesthetic even if an asset fails to load.
- **UI Interaction Parity**: Interactive elements in similar contexts (e.g., TMs in the Pokedex vs Attacks in the team view) MUST provide consistent feedback and open the same specialized modals. Maintain user expectation by ensuring that if a Move name is clickable in one tab, it is clickable and functional in all others.
- **Scroll Stability**: To prevent layout shifts ("scroll-jumps") when modals open/close, ALWAYS use `scrollbar-gutter: stable` on the `body` or main containers. This reserves space for the scrollbar even when not visible.

### 2. Asset Integrity & Resolution

- **Sanitization**: All dynamic asset IDs (especially from external APIs like PokeAPI or Showdown) MUST be sanitized: remove spaces and dots (e.g., `Lt. Surge` → `ltsurge`) and force `toLowerCase()` before URL construction.
- **Routing Edge Cases**: When routing sprites for variants or special states (e.g., Manaphy Eggs), use `startsWith()` prefix matching (e.g. `id.startsWith('egg')`) instead of exact matches in the `assetService` to ensure all variant naming conventions map to the correct base asset.
- **Faction Normalization**: Faction names (Spanish 'poder'/'unión' and English 'power'/'union') MUST be normalized before comparison using centralized helpers (e.g., `normalizeFaction`). This prevents logic failures when comparing database strings with UI/Store states.
- **Prioritization**: Always prioritize local assets (`/public/assets/`) over remote APIs. Check for local existence or maintain an explicit "Local-Only" list to prevent unnecessary remote 404s for assets already in the repo.

### 3. The 500-Line Threshold

- **MANDATORY**: No `.vue`, `.js`, or `.scss` file may exceed 500 lines (excepts "databases" style files).
- **Exception**: Data-only definition files and external/legacy backups.
- **Action**: Refactor any violator file you touch before submitting.

### 4. Pure Vue Standard

- **FORBIDDEN**: Direct DOM manipulation (`querySelector`, `innerHTML`, etc.).
- **REQUIRED**: All UI state MUST be reactive (Refs, Reactive, Pinia).
- **Pinia Naming**: Always verify and match the exact capitalization of Pinia store exports (e.g., `useUIStore` vs `useUiStore`). Incorrect capitalization in imports will lead to silent failures or module resolution errors in Vite.
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py` after UI changes.

### 5. Architectural Reuse & Inheritance

- **MANDATORY**: Before implementing any new UI container, layout, or logic system, search for existing generic implementations (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`, `inventoryStore`).
- **FORBIDDEN**: Creating "islands" of logic or styling that duplicate existing functionality (e.g., a custom window with hardcoded styles instead of extending `BaseModal`).
- **REQUIRED**: Leverage Inheritance and Composition. If a feature is 90% similar to an existing one, extend or parameterize the existing system (using props like `variant`, `size`, `hide-header`) instead of starting from scratch.

### 6. Pixel-Perfect Typography (MANDATORY)

- **Grid Alignment**: Pixel fonts (especially `Press Start 2P`) MUST strictly use multiples of their native 8px design grid (**8px, 16px, 24px, 32px**).
- **Anti-Alias Ban**: ALWAYS apply `@include pixelated` or `@include pixel-perfect($size)` to pixelated elements to force `-webkit-font-smoothing: none !important`.
- **FORBIDDEN**: Using intermediate sizes (9px, 10px, 11px, 13px, 15px) or CSS `text-shadow` on small pixel fonts, as these trigger browser-level subpixel blurring.
- **BST Aesthetics**: RPG statistics and totals MUST prioritize these sharp, high-contrast pixelated tokens over modern sans-serif fonts.

### 7. Game Mechanics & Data Visualization

- **Stat Dualism**: Always separate **Real Statistics** (calculated values used in battle) from **Genetic Potential (IVs)**. Use distinct sections or visual graphs to prevent cognitive overload and ensure the player understands what can be changed (EVs/Level) versus what is innate (IVs).
- **Tag Persistence Protocol**: Any interaction that toggles a Pokemon state (like tags or favorites) MUST call the persistence layer immediately (e.g., `gameStore.save()`).
  - **Bridge Signature**: The standard signature for tagging is `window.togglePokeTag(context, index, tagId)`, where context is `'team'` or `'box'`.
- **Nature Visual Encoding**: Use consistent color coding for nature-influenced stats in all UI tooltips and text values:
  - **Red**: Attack
  - **Yellow**: Defense
  - **Blue**: Sp. Attack
  - **Green**: Sp. Defense
  - **Purple**: Speed
- **Mechanical Integrity (Vigor)**: Clearly define finite mechanics in tooltips. For example, **Vigor** MUST be documented as an absolute breeding limit that is consumed upon egg production and **NEVER** recovers. Avoid vague terms that imply rechargeable "energy".

---

## 🎨 SASS & Syntax Traps

### 1. Filter Collision (Dart Sass 2.0)

- **MANDATORY**: Use **Capitalization** (e.g., `Grayscale(1)`, `Brightness(1.1)`, `Scale(1.2)`, `Blur(5px)`, `Rotate(90deg)`, `TranslateX(10px)`) for all CSS filters and transform functions.

> [!WARNING]
> **SASS Filter Collision**: You MUST use **Capitalization** for `Brightness()`, `Scale()`, `Blur()`, `Rotate()`, and `Grayscale()` in `.vue` and `.scss` files. Using lowercase (e.g., `scale(1.1)`) causes Sass to intercept them as internal color functions, leading to critical build errors.

- **WHY**: Lowercase functions with unitless numbers (e.g., `scale(1.2)`) are misinterpreted by Dart Sass 2.0 as color functions, causing errors like `[sass] $color: 1.2 is not a color.`.
- **MANDATORY**: Use **Capitalization** for `Scale()`, `Blur()`, `Rotate()`, `TranslateX()`, `TranslateY()`, `TranslateZ()`, `Grayscale()`, `Brightness()`, `Saturate()`, `Drop-shadow()`, etc.
- **GPU Tip**: Prefer `opacity: X` property over `filter: Opacity(X)` for better performance and to avoid SASS traps.
- **SFC Scoped Isolation**: Scoped styles (`<style scoped>`) do NOT cascade to child component roots. When extracting sub-components (e.g., Tabs), either use non-scoped styles with central partial imports (`@use "@/styles/components/pokedex-detail"`) or inline critical styles to prevent "broken" aesthetics.

### 3. CSS Redundancy & Specificity

- **REQUIRED**: Core components (Cards, Modals, HUD, Buttons) MUST have a "Single Source of Truth" for their styles.
- **MANDATORY REUSE**: All action buttons MUST use the standardized mixins:
  - `@include btn-vicio-primary;` (Yellow/Confirm/Primary)
  - `@include btn-vicio-danger;` (Red/Cancel/Danger)
  - `@include btn-vicio($variant, $size);` (Modular system for all UI)
- **FORBIDDEN**: Redefining background/border styles for buttons manually or creating ad-hoc classes (e.g. `close-btn-primary`, `action-btn`).
- **3D Depth Integrity**: Active states (`.active`) MUST NOT strip the button's bottom shadow. Maintain the "dark part" by calculating highlights only on the top surface.
- **SASS vs CSS Variables**: SASS color functions (like `color.scale`) cannot process `var(--color)`. For interactive highlights, use static SASS fallbacks for calculations while maintaining the CSS variable for the main render to support dynamic theming.
- **Debug Density**: Admin/Debug buttons should fit content (`flex: 0 0 auto`) to avoid horizontal stretching and text overlap in dense rows.
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/detect_css_redundancy.py` to identify overlaps and plan refactoring.

### 2. SASS Math & Strings

- **REQUIRED**: Use namespaced functions (e.g., `math.random`, `string.unquote`).
- **Audit & Fix**:
  - **AUTOMATED**: A Vite plugin (`sassTrapsFixer`) is now active in `vite.config.js`. It automatically capitalizes trap functions and fixes `rgba(var())` collisions during development and build.
  - Run `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` to manually verify.

### 4. Specificity & Collision Control

- **MANDATORY**: When multiple components share 80%+ of their visual structure (e.g., `Pokedex` and `UnifiedDetail`), you MUST extract common styles into a **SCSS Mixin** or a **Core Partial** in a dedicated sub-folder (e.g., `@/styles/components/pokemon-detail/_core.scss`).
- **FORBIDDEN**: Duplicating complex layouts (like negative margins and absolute positioning) across multiple files. This leads to "Style Pollution" where one file overrides another unpredictably.
- **REQUIRED**: Avoid `!important` in component styles. If you need to override a base style, use higher specificity or parameterize the base mixin.
- **Audit & Repair**:
  - Run `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py` to identify standards violations (Z-Index, DOM access, Hardcoded colors).
  - Run `python3 .agents/skills/project-standards/scripts/fix_hybrid_patterns.py` to automatically inject image fallbacks and standardize core colors.
- **Hex Replacement Safety**: Repair scripts MUST sort color patterns by length descending (e.g., `#ffffff` before `#fff`) and use negative lookaheads `(?![0-9a-fA-F])` to prevent partial/corrupted replacements (e.g., `#ffff00` becoming `$whitef00`).

### 5. Modular Partial Enforcement

- **REQUIRED**: If a style file (especially SCSS) grows beyond the **500-line limit**, split it into functional partials (`_base.scss`, `_tabs.scss`, `_panes.scss`) within a sub-directory and use a main index/manifest file to reassemble them.

### 6. Script Synchronization Mandate

- **MANDATORY**: Every time this skill or the specialized manuals are modified, you MUST verify if the associated Python scripts (`check_*.py`, `detect_*.py`, `fix_*.py`) require updates to include new rules, tokens, or forbidden patterns.
- **FORBIDDEN**: Letting the automated tools fall out of sync with the project's evolving DNA.

---

## 🛰️ Realtime & Offline Simulation

### 1. Offline Event Emulation

- **REQUIRED**: In `offline` mode, features that normally rely on Realtime listeners (e.g., Chat, Battle events) MUST manually update the local store state after a successful DB operation to simulate the missing server broadcast.
- **Fail-Safe**: Do not block features in offline mode unless they are strictly non-functional without a network.

### 2. Engine Initialization

- **REQUIRED**: The `PhaserGame` component MUST be rendered in the DOM for the engine to initialize and fire the `game-state-ready` event.
- **CRITICAL**: Do NOT wrap `PhaserGame` in a `v-if` condition that depends on the engine being ready, as this creates a circular dependency that blocks the application indefinitely. Always render the engine in the background (e.g., behind a loading overlay) once the user session is identified.

---

## ⚙️ Execution Governance

### 1. Dev Server Reuse

- Check for existing `vite` processes before running `npm run dev`. Reuse existing sessions.
- Monitor active terminal logs for runtime errors before declaring success.
- **Windows PowerShell Syntax**: Use `;` instead of `&&` for command concatenation (e.g., `npm run lint; npm run build`). `&&` is not a valid separator in standard PowerShell.

### 2. Python Self-Healing

- Skill scripts MUST use `try/except ImportError` blocks with the `[PYTHON_DEPENDENCY_ERROR]` tag.
- **Unicode Compatibility**: NEVER use emojis or special Unicode characters (e.g., `✨`, `🔥`) in script output intended for terminal consoles on Windows (CP1252) to avoid `UnicodeEncodeError`.
- **Grep on Windows**: Avoid raw `grep` in PowerShell. Use `Select-String` or the provided `grep_search` tool for reliable results across environments.

### 3. Script Hygiene & Documentation

- **MANDATORY**: Every active script in the `scripts/` directory MUST have a header comment explaining its **Utility** (what it does) and **Importance** (why it exists in the architecture).
- **FORBIDDEN**: Keeping obsolete or legacy scripts that reference non-existent files or pre-migration paths. Purge these immediately to prevent workspace pollution.
- **Game Performance Priority**: Every UI and logic implementation MUST prioritize GPU-accelerated rendering and FPS stability. Use optimized filter chains (e.g., `pokemon-outline-performance`) and object pooling to ensure maximum fluidity without compromising visual quality.

### 6. Modal Stack & Performance Synchronization

To ensure a seamless "Hybrid Retro-Modern" experience, the background (map/routes) must synchronize its rendering state with the modal stack.

- **Trigger (Obscure Mode)**: Performance mode (map simplification) is ONLY triggered by modals that obscure the background (variants with overlays).
- **Entrance Logic**: Activate simplification **AFTER** the first obscuring modal's entrance animation completes. This prevents the map from "disappearing" while still visible during the transition.
- **Exit Logic**: Restore full map fidelity **AS SOON AS** the last obscuring modal starts its exit animation. This allows the user to see the full background through the fading overlay.
- **Persistence**: The simplified mode must persist as long as the stack contains at least one obscuring modal.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **File Length**: No violator files (excluding exceptions).
- [ ] **Architectural Reuse**: Verified that no new "islands" were created and existing systems (Modals, Cards, DB) were reused/extended where possible.
- [ ] **Redundancy Audit**: `detect_css_redundancy.py` shows 0 critical overlaps for core components.
- [ ] **Validations**: SASS Traps and Hybrid Patterns detection scripts pass (0 errors).
- [ ] **Self-Healing**: Automated repair scripts (`fix_sass_traps.py`, `fix_hybrid_patterns.py`) have been executed to ensure compliance.
- [ ] **Tokens**: Hardcoded hex colors replaced with variables; `$white` and `$black` used correctly.
- [ ] **Z-Index**: All layers follow the standardized scale in `_variables.scss` (no values > 999 unless Teleported tooltips).
- [ ] **Linting**: `npm run lint` passes with 0 errors.
- [ ] **Discovery Logic**: Fog of War (Unknown/Seen/Caught) states follow standard opacities and filters.
- [ ] **Sync**: Database changes follow Triple Parity rules.
- [ ] **Overlay Check**: Ensure modal overlays are siblings BEHIND the card, not parents, to avoid blurring content.
- [ ] **Performance Mode**: Use `uiStore.isAnyBlockingModalOpen` to trigger the map simplification mode.
  - **Entrance**: Activate simplification AFTER the first obscuring modal finishes its opening animation.
  - **Exit**: Restore the full map AS SOON AS the last obscuring modal starts its closing animation.
  - **LIFO Persistence**: Maintain simplification as long as any obscuring modal remains in the stack.
- [ ] **DB Parity**: WASM versions in `sqliteEngine.js` match `index.html`.
