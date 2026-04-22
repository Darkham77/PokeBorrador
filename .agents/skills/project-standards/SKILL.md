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

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern UI Shell**: Use premium CSS (Glassmorphism, gradients) for layouts and containers.
- **Retro Heart**: Use Pixel Art and Sharp Typography for all game-world content and data.
- **UI Variants**: Leverage `BaseModal` variants (`modern` vs `retro`) to match the context. Gameplay/Config = `retro` (yellow border). Shell/Web = `modern`.
- **UI Logic**: Always use parameterized props (`hide-header`, `variant`) instead of ad-hoc style overrides.
- **Fog of War (Discovery)**: Implement standard discovery states across all UI:
  - **Unknown**: `?` placeholder, `???` label, 0.1 opacity.
  - **Seen (Not Caught)**: Silhouette (`filter: Brightness(0)`), 0.2-0.3 opacity, name visible.
  - **Caught**: Full color, 1.0 opacity.

### 2. The 500-Line Threshold

- **MANDATORY**: No `.vue`, `.js`, or `.scss` file may exceed 500 lines.
- **Exception**: Data-only definition files and external/legacy backups.
- **Action**: Refactor any violator file you touch before submitting.

### 3. Pure Vue Standard

- **FORBIDDEN**: Direct DOM manipulation (`querySelector`, `innerHTML`, etc.).
- **REQUIRED**: All UI state MUST be reactive (Refs, Reactive, Pinia).
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/detect_hybrid_patterns.py` after UI changes.

### 4. Architectural Reuse & Inheritance

- **MANDATORY**: Before implementing any new UI container, layout, or logic system, search for existing generic implementations (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`, `inventoryStore`).
- **FORBIDDEN**: Creating "islands" of logic or styling that duplicate existing functionality (e.g., a custom window with hardcoded styles instead of extending `BaseModal`).
- **REQUIRED**: Leverage Inheritance and Composition. If a feature is 90% similar to an existing one, extend or parameterize the existing system (using props like `variant`, `size`, `hide-header`) instead of starting from scratch.

---

## 🎨 SASS & Syntax Traps

### 1. Filter Collision (Dart Sass 2.0)

- **MANDATORY**: Use **Capitalization** (e.g., `Grayscale(1)`, `Brightness(1.1)`, `Scale(1.2)`, `Blur(5px)`) for all CSS filters and transform functions.

> [!WARNING]
> **SASS Filter Collision**: You MUST use **Capitalization** for `Brightness()`, `Scale()`, `Blur()`, `Rotate()`, and `Grayscale()` in `.vue` and `.scss` files. Using lowercase (e.g., `scale(1.1)`) causes Sass to intercept them as internal color functions, leading to critical build errors.

- **WHY**: Lowercase functions with unitless numbers are misinterpreted by Dart Sass 2.0 as color functions, causing errors like `[sass] $color: 1.2 is not a color.`.
- **MANDATORY**: Use **Capitalization** for `Scale()`, `Blur()`, `Rotate()`, `TranslateX()`, `TranslateY()`, `TranslateZ()`, `Grayscale()`, `Brightness()`, `Saturate()`, `Drop-shadow()`, etc.
- **DETECTED REGRESSION**: Lowercase usage in filters/transforms breaks production builds (e.g., `scale(1.1)` or `translateY(10px)` triggers color-function collisions). Do NOT omit capitalization.
- **GPU Tip**: Prefer `opacity: X` property over `filter: Opacity(X)`.

### 3. CSS Redundancy & Specificity

- **REQUIRED**: Core components (Cards, Modals, HUD, Buttons) MUST have a "Single Source of Truth" for their styles.
- **MANDATORY REUSE**: All action buttons MUST use the standardized mixins:
  - `@include btn-vicio-primary;` (Yellow/Confirm/Primary)
  - `@include btn-vicio-danger;` (Red/Cancel/Danger)
- **FORBIDDEN**: Redefining background/border styles for buttons manually when these mixins exist.
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/detect_css_redundancy.py` to identify overlaps and plan refactoring.

### 2. SASS Math & Strings

- **REQUIRED**: Use namespaced functions (e.g., `math.random`, `string.unquote`).
- **Audit**: Run `python3 .agents/skills/project-standards/scripts/check_sass_traps.py` after styling changes.

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
- [ ] **Validations**: SASS Traps and Hybrid Patterns detection scripts pass.
- [ ] **Linting**: `npm run lint` passes with 0 errors.
- [ ] **Production Build**: `npm run build` passes without errors.
- [ ] **Tests**: `npm run test` passes; new logic has unit tests.
- [ ] **Aesthetics**: Hybrid contrast, Flexbox centering (no `translate(-50%, -50%)`), hard text-shadows, and Typography sharpness verified.
- [ ] **Discovery Logic**: Fog of War (Unknown/Seen/Caught) states follow standard opacities and filters.
- [ ] **Sync**: Database changes follow Triple Parity rules.
- [ ] **Overlay Check**: Ensure modal overlays are siblings BEHIND the card, not parents, to avoid blurring content.
- [ ] **Performance Mode**: Use `uiStore.isAnyBlockingModalOpen` to trigger the map simplification mode.
  - **Entrance**: Activate simplification AFTER the first obscuring modal finishes its opening animation.
  - **Exit**: Restore the full map AS SOON AS the last obscuring modal starts its closing animation.
  - **LIFO Persistence**: Maintain simplification as long as any obscuring modal remains in the stack.
- [ ] **DB Parity**: WASM versions in `sqliteEngine.js` match `index.html`.
