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
| **Animaciones & FX** | [animation_standards.md](./references/animation_standards.md) |
| **GPU & Performance** | [gpu_optimization_manual.md](./references/gpu_optimization_manual.md) |
| **Modales & Performance** | [modal_performance.md](./references/modal_performance.md) |
| **Phaser & Rendering** | [phaser_guidelines.md](./references/phaser_guidelines.md) |
| **UI/UX & Aesthetics** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **SASS Styling** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Database Architecture** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Sync & Security** | [security_and_sync_manual.md](./references/security_and_sync_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |
| **Map & Spawns** | [spawn_grid_manual.md](./references/spawn_grid_manual.md) |
| **Reglas & Mecánicas** | [game_rules_manual.md](./references/game_rules_manual.md) |
| **Finalized Features** | [completed_features.md](../../../docs/completed_features.md) |

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: Glassmorphism, gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements MUST use `@include pixelated`. Font size should prioritize readability and aesthetic balance. Statistics, credits, and numerical counters in UI headers MUST always use pixelated typography.

### 2. GPU & Rendering

- **GPU First**: Prioritize GPU-accelerated rendering. See [gpu_optimization_manual.md](./references/gpu_optimization_manual.md).
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel**: De-synchronize animations with seeds and vary speeds. See [animation_standards.md](./references/animation_standards.md).
- **GPU Efficiency**: Use the native `opacity` property instead of `filter: Opacity()` to avoid unnecessary compositor layers.

### 3. Modularity & Hierarchy

- **500-Line Rule**: No logic or style file may exceed 500 lines (except databases).
- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Modal Lifecycle**: Synchronize performance mode with modal transitions. Avoid "Modal Islands" (manual template rendering); always use `uiStore.open`. See [modal_performance.md](./references/modal_performance.md).
- **Immediate Simplification**: Activate background performance mode **IMMEDIATELY** when an obscuring modal begins its opening animation to prevent noisy FX during transitions.

### 4. SASS & Build Integrity

- **Capitalization Mandate**: Use Capitalized Filters (`Scale()`, `Blur()`, `Brightness()`, `Rgba()`, `Rgb()`, `Linear-Gradient()`, `Radial-Gradient()`) to avoid Dart Sass 2.0 collisions. This applies to `.scss`, `.vue`, and constant files (`.js`, `.ts`).
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`. Eliminate unused vars and computed properties immediately.
- **CSS Redundancy Audit**: Use `python3 .agents/skills/project-standards/scripts/audit/detect_css_redundancy.py` before commit. To bypass valid nested override flags, use SASS ampersand nesting (`& .class-name {`) to explicitly declare inheritance and avoid duplicate selector penalties.
- **Click Propagation**: Always use `@click.stop` for interactive elements in layered UIs (cards, lists, modals) to prevent accidental bubbling to background containers. **CRITICAL**: When using `.stop` on a custom component listener in the parent, the child MUST pass the event object in the emit (e.g., `@click.stop="$emit('click', $event)"`) to avoid `stopPropagation` of undefined crashes.
- **Media Query Nesting**: To avoid CSS redundancy flags, always nest media queries within their respective class selectors. Avoid global `@media` blocks that repeat selectors.
- **Flex Scroll Collapse**: Containers with `overflow-y: auto` that are children of flex parents MUST include `min-height: 0` to prevent layout colapse across modern browsers.
- **UI Interaction**: Use `@include btn-vicio-primary('sm')` for secondary modal buttons to avoid 100% width collisions. All interactive filter/sort controls MUST include a `PVTooltip`.
- **Vue Template Integrity**: NEVER use JS-style (`//`) or HTML comments inside Vue tags or attributes. This causes Vite compilation errors ("Illegal '/' in tags").
- **Z-Index Layering**: Hardcoded numbers are forbidden. Use system CSS variables (`--z-low`, `--z-base`, etc.) exclusively. If a precise micro-offset is required (e.g., between two layers of the same tier), use `calc(var(--z-base) + N)` to maintain relative hierarchy without breaking the audit engine.

### 5. Asset Pipeline & 1:1 Resolution

- **Resolution Policy**: Use 1:1 original quality for all assets. Multi-resolution (LOD) systems are strictly forbidden to ensure architectural simplicity and visual consistency.
- **WebP Standard**: All local assets MUST be converted to WebP via the Zero-Config pipeline.
- **Mirroring**: The `_raw-assets/` directory mirrors the `public/assets/` structure 1:1. Never use intermediate control folders like `lod/` or `original/`.
- **Localization Mandate**: To ensure offline capability and consistent performance, all external assets (PokeAPI, Showdown) MUST be localized to `_raw-assets/` and optimized into WebP format.
- **Mapping Consistency**: Filenames for localized assets MUST match the sanitized/mapped IDs (lowercase, no spaces/dots, English slugs for items) used in `assetService.js`.
- **Texture Atlases**: Use `.atlas/` folders for batched sprites (VFX, Phaser animations) to optimize draw calls.

### 6. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states, levels, and money.
- **Verification**: It is MANDATORY to verify new content via CLI before commits.

### 7. Vue & UI Patterns

- **Reactivity with Spread**: Forcing reactivity in Vue 3 `reactive` objects when modifying nested properties requires re-assigning the root property using the spread operator (e.g., `state.inventory = { ...state.inventory }`). This guarantees the virtual DOM reflects deep state changes.
- **v-model Object Pattern**: State objects intended to be used with `v-model` in child components MUST be defined as `ref` instead of `reactive`. This allows the parent to handle the `update:modelValue` event by re-assigning the entire object (e.g., `filters.value = newValue`), which is the standard behavior for one-way data flow in Vue 3.
- **BaseModal Overlays**: Prefer `BaseModal` over custom absolute-positioned overlays for complex user interactions (like quantity selectors). This ensures consistent backdrop handling, Z-index management, and keyboard accessibility.
- **Semantic Action Menus**: Group multi-stage interactions (Use, Sell, Discard) into dedicated action menus. Use themed buttons (Success/Primary for usage, Warning for sales, Danger for deletion) to provide clear visual hierarchy and intent.
- **Bulk Operation Optimization**: In management views (inventory, boxes), multi-selection modes should default to "Full Stack" (selecting all items of that type) to minimize modal interactions.
- **Financial Transparency**: Always display estimated total profits in confirmation dialogs for bulk selling operations to provide immediate user feedback.

### 8. Logic & Determinism

- **Authoritative Time**: Always use `getServerTime()` for game-logic-critical timestamps. Avoid `Date.now()` to ensure administrative time-travel debugging works correctly. See [security_and_sync_manual.md](./references/security_and_sync_manual.md).
- **PRNG Avalanche Protocol**: When using deterministic seeds for gameplay features (weather, spawns), the PRNG **MUST** discard the first 3 generated values to ensure high entropy between sequential seeds.

---

## 🏗️ Workflow & Artifact Governance (MANDATORY)

To ensure rigor and traceability, every complex task MUST follow the Artifact lifecycle.

1. **Planning**: Create `implementation_plan.md`. Wait for user "ok".
2. **Execution**: Maintain `task.md` as the absolute source of truth for granular steps.
3. **Closure**: Create `walkthrough.md` with evidence (screenshots, tests) of the task's success.

---

## 🛠️ Aesthetic Audit Checklist

- [ ] **Architectural Reuse**: Have I reused existing components?
- [ ] **GPU Acceleration**: Have I applied layer promotion on heavy elements?
- [ ] **Pixel Parity**: Is all game content pixelated and sharp?
- [ ] **CLI-First**: Have I verified the state via console?
- [ ] **Zero-Warning**: Do `npm run lint` and `build` pass without warnings?
