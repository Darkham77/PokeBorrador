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
- **Pixel-Perfect**: Pixelated elements MUST use `@include pixelated`. Font size should prioritize readability and aesthetic balance.

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

- **Capitalization Mandate**: Use Capitalized Filters (`Scale()`, `Blur()`, `Brightness()`, `Rgba()`, `Rgb()`) to avoid Dart Sass 2.0 collisions. This applies to `.scss`, `.vue`, and constant files (`.js`, `.ts`).
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`. Eliminate unused vars and computed properties immediately.
- **CSS Redundancy Audit**: Use `python3 .agents/skills/project-standards/scripts/audit/detect_css_redundancy.py` before commit. To bypass valid nested override flags, use SASS ampersand nesting (`& .class-name {`).
- **Click Propagation**: Always use `@click.stop` for interactive elements in layered UIs (cards, lists, modals) to prevent accidental bubbling to background containers. If a numeric emit is required and `.stop` is incompatible, use `data-ignore="[PureVue-Ignore]"` on the SAME line as the handler.
- **UI Interaction**: Use `@include btn-vicio-primary('sm')` for secondary modal buttons to avoid 100% width collisions. All interactive filter/sort controls MUST include a `PVTooltip`.
- **Vue Template Integrity**: NEVER use JS-style (`//`) or HTML comments inside Vue tags or attributes. This causes Vite compilation errors ("Illegal '/' in tags").
- **Z-Index Layering**: Hardcoded numbers are forbidden. Use system CSS variables (`--z-low`, `--z-base`, etc.) exclusively.

### 5. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states, levels, and money.
- **Verification**: It is MANDATORY to verify new content via CLI before commits.

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
