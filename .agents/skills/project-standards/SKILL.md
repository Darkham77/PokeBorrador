---
name: project-standards
description: Core governance for the Poké Vicio project. Enforces Hybrid Retro-Modern identity, 500-line modularity, and Zero-Warning SASS/Vue standards. Includes diagnostic scripts for automated auditing and self-correction of viewport and GPU anti-patterns. Use this as a Navigation Hub to access technical manuals for Database, Assets, and UI.
---

# Project Standards (Lean Core)

This skill governs the DNA of the project. Technical implementation details are delegated to specialized manuals to ensure a lightweight and effective rule base.

## 🧭 Navigation Hub

Consult these manuals for detailed implementation specifications:

| Domain | Reference Manual |
| :--- | :--- |
| **Content Creation** | [content_creation_manual.md](./references/content_creation_manual.md) |
| **Battle Mechanics** | [battle_mechanics_manual.md](./references/battle_mechanics_manual.md) |
| **Mechanics & UX** | [game_mechanics_manual.md](./references/game_mechanics_manual.md) |
| **UI/UX Standards** | [ui_ux_standards.md](./references/ui_ux_standards.md) |
| **Formulas & Ratios** | [game_formulas_manual.md](./references/game_formulas_manual.md) |
| **Item System** | [item_system_manual.md](./references/item_system_manual.md) |
| **War & Factions** | [war_system_manual.md](./references/war_system_manual.md) |
| **Gyms & Rematch** | [gym_system_manual.md](./references/gym_system_manual.md) |
| **Social & Trade** | [trade_social_manual.md](./references/trade_social_manual.md) |
| **DB Architecture** | [dbrouter_manual.md](./references/dbrouter_manual.md) |
| **Validation & Quality** | [validation_manual.md](./references/validation_manual.md) |
| **Save & Persistence** | [save_system_manual.md](./references/save_system_manual.md) |
| **Testing & Simulation** | [browser_testing_manual.md](./references/browser_testing_manual.md) |
| **Animations & FX** | [animation_standards.md](./references/animation_standards.md) |
| **GPU & Performance** | [gpu_optimization_manual.md](./references/gpu_optimization_manual.md) |
| **SASS & Styling** | [sass_styling_manual.md](./references/sass_styling_manual.md) |
| **Asset Pipeline** | [asset_service_manual.md](./references/asset_service_manual.md) |
| **Map & Spawns** | [spawn_grid_manual.md](./references/spawn_grid_manual.md) |
| **Combat Camera** | [combat_camera_manual.md](./references/combat_camera_manual.md) |
| **Dependencies** | [dependency_management_manual.md](./references/dependency_management_manual.md) |

### 🛠️ Migration & Technical Support

- **Legacy Migration Hub**: [legacy_migration_manual.md](./references/legacy_migration_manual.md)
- **DB Technical Notes**: [references/migration/](./references/migration/)

---

## 🏛️ Core Mandates

### 1. Hybrid Retro-Modern Identity

- **Modern Shell**: Glassmorphism, gradients, HSL shadows for containers.
- **Retro Heart**: Pixel Art and Sharp typography (`Press Start 2P`) for game content.
- **Pixel-Perfect**: Pixelated elements MUST use `@include pixelated`. Typography for stats and headers must always be pixelated.

### 2. GPU & Rendering

- **GPU First**: Prioritize hardware-accelerated rendering. See [gpu_optimization_manual.md](./references/gpu_optimization_manual.md).
- **Sprite Standard**: Use `@include sprite-render` for all game assets.
- **Organic Feel**: Desynchronize animations using seeds and vary speeds.

### 3. Modularity & Hierarchy

- **500-Line Rule**: No logic or style file may exceed 500 lines (except for massive databases).
- **Zero-Invention**: Reuse `BaseModal`, `UnifiedCard`, and global mixins before creating ad-hoc styles.
- **Modal Lifecycle**: Synchronize performance mode with modal transitions.
- **Import Hygiene**: When implementing cross-component signals (e.g., calling `loadingStore` from a View), ALWAYS verify the import is present. Missing imports in lifecycle hooks (`onMounted`) are a primary cause of initialization deadlocks.
- **Engine Signaling (Loading Gate)**: Signal "App Mounted" only after the primary Vue views have finished mounting (`onMounted`). The loading veil MUST use `v-if` to be completely purged from the DOM after initialization, preventing blocking layers or performance issues.
- **Dynamic Viewport (Mobile)**: Use `dvh` units (e.g., `100dvh`) for full-screen containers to ensure the UI adapts correctly to mobile browser toolbars without clipping.
- **Decoupled FX (GameBus)**: Trigger non-critical visual effects or multi-component animations via `GameBus.emit()` to avoid direct component-to-component dependencies.
- **Pure Vue Compliance**: Avoid direct DOM/Canvas operations in Vue components. For mandatory performance-critical low-level code (e.g. Canvas generation) or long data structures, use the explicit ignore tags to satisfy the automated audit:
  - `// [PureVue-Ignore]`: Bypasses technical DOM/Window access checks.
  - `// [PureVue-Ignore-Length]`: Bypasses the 500-line limit for data-heavy files.
  - `// [PureVue-Ignore-Aesthetics]`: Bypasses hardcoded color/shadow audits for specialized FX or legacy styles.
- **Unitless Variable Pattern**: Cuando se pasan coordenadas o tamaños dinámicos de JS a variables CSS, usar SIEMPRE valores numéricos puros. Añadir unidades en CSS usando `calc(var(--val) * 1px)`.
- **Zero Bridges Policy**: Se prohíbe el uso de `window.state` o cualquier puente de compatibilidad global (`src/logic/bridges`). Toda la comunicación debe realizarse mediante importaciones directas (ESM) e inyección de dependencias a través de Stores de Pinia. La manipulación del estado global desde la consola debe reservarse exclusivamente para `window.__VITE_DEBUG__`.
- **Modular Orchestration (HUD)**: Lógica de visibilidad, snapshots y estados de interfaz de combate de alta complejidad DEBEN ser extraídos a composables dedicados (ej. `useBattleHud.js`). La vista de la arena (`BattleArenaView.vue`) debe actuar exclusivamente como un orquestador visual simplificado.

### 4. SASS and Build Integrity

- **Capitalization Duality**:
  - **SASS Filters**: Use capitalized filters (`Scale()`, `Blur()`, `Brightness()`) to avoid collisions with Dart Sass 2.0 native functions.
  - **Browser Transforms**: Use standard LOWERCASE for CSS transformations (`translate`, `scale`, `rotate`). Capitalizing these may cause browser interpretation failures and break layout positioning.
- **@use Standard**: Forbidden use of `@import`. Use `@use` and `@forward`.
- **Zero-Warning**: Always maintain 0 errors and 0 warnings in `lint` and `vue-tsc`.
- **Dependency Shield**: Scripts using external libraries must handle `ImportError` and provide installation instructions.

### 5. CLI-First Debugging

- **Efficiency Over GUI**: Use `window.__VITE_DEBUG__` commands to simulate states. It is MANDATORY to verify new content via CLI before committing.

### 7. Symbolic Documentation & Source of Truth (Zero-Hardcoding)

- **Referential Integrity**: Documentation and manuals MUST avoid hardcoded game constants (e.g., pixel sizes, coordinate values).
- **Source of Truth**: Always point to the centralized logic file (e.g., `spatialCoordinator.js`) as the owner of the numbers.
- **Relativity**: Explain technical specs using symbolic names (`ENTITY_SIZE_P1/P2`) and logical relationships (`SAFE_ZONE_BOTTOM - ENTITY_SIZE_P1`) rather than absolute values.

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

## 📊 Diagnostic Tools

Use these scripts to verify project standards:

- `detect_gpu_gaps.py`: Scans for missing layer promotion or expensive filters.
- `detect_outline_traps.py`: Detects expensive Quad Drop-Shadow outlines that should be migrated to SVG.
- `detect_viewport_units.py`: Detects legacy `vw`/`vh` units that should be migrated to `dvw`/`dvh`.
- `detect_hybrid_patterns.py`: Scans for UI/Logic identity mismatches.
