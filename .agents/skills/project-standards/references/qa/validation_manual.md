# Validation and Quality Manual (Poké Vicio)

This manual centralizes all automatic validation protocols to ensure that code and data comply with the project's technical rigor standards.

## ⚔️ Battle and Pokémon Data Validation

### 1. Moves (`MOVE_DATA`)

Any change in `src/data/moves.js` or in battle logic must be validated:

- **Structure**: `node .agents/skills/pokemon-move-validator/scripts/validator.js` (detects duplicates and semantic errors).
- **PokeAPI Synchronization**: `node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js` (verifies categories and effects against the official standard).
- **Engine Integrity**: `node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js` (ensures that every `effect` has an implementation in `battleMoves.js`).

### 2. Abilities (`ABILITY_DATA`)

- **General Validation**: `node .agents/skills/pokemon-ability-validator/scripts/validator.js`.
- Verifies descriptions and existence of logic in `battleAbilities.js`.

### 3. Battle Engine (FSM)

Any modification to `orchestrator.js`, `battleFlow.js`, or the battle state machine MUST pass these audits:

- **Diagram Parity**: `node .agents/skills/project-standards/scripts/verify_fsm_diagrams.js` (detects missing states or broken transitions).
- **Implementation Integrity**: `node .agents/skills/project-standards/scripts/audit_fsm_implementation.js` (detects race conditions and unimplemented sub-states).
- **Sequential Flow Parity**: `node .agents/skills/project-standards/scripts/audit_fsm_flow_parity.js` (ensures the orchestrator follows the manual's Mermaid diagrams 1:1).

---

## 🧪 Testing Standards

Core logic modules and critical system components MUST have dedicated unit tests in `tests/unit/`.

1. **Factory Integrity**: Every data factory (e.g., `pokemonFactory.js`) must be covered by unit tests verifying generation, level-up, and sanitization (Self-Healing).
2. **Regression Prevention**: When modifying `src/logic/`, perform a **Test Gap Analysis**; if a module is "worthy" (core behavior), create a new `.spec.js` file.
3. **Execution**: Run `npm run test` before every commit to ensure 100% pass rate.

---

## 🛠️ Standards Audit (Local Scripts)

The project has custom audit scripts in `.agents/skills/project-standards/scripts/audit/`:

- **CSS Redundancy Detection**: `python3 detect_css_redundancy.py`. Verifies duplicate selectors or unnecessary nesting.
- **Hybrid Pattern Detection**: `detect_hybrid_patterns.py`. Identifies direct DOM access or lack of pixelation.
- **Global Audit**: `python3 .agents/skills/project-standards/scripts/audit_project.py`. Runs all SASS, GPU, and file length checks.

---

## 🚨 Non-Negotiable Quality Rules

1. **Zero-Warning**: `npm run lint` and `npx vue-tsc --noEmit` MUST return 0 errors and 0 warnings before any commit.
2. **SASS Capitalization**: All CSS filters (`Blur()`, `Scale()`) must be capitalized to avoid collisions with Dart Sass 2.0.
3. **Dependency Shield**: Any script using external libraries (e.g., `Pillow`) must handle `ImportError` and provide clear installation instructions.
4. **Audit Bypass**: If a violation is intentional by design, use the `// [PureVue-Ignore]` comment. The audit engine checks the **current line and the line immediately above** to support Vue/HTML attributes that span multiple lines.
5. **Large Data Integrity**: Massive data files (e.g., spawn grids) must carry `// [PureVue-Ignore-Length]` at the beginning to avoid fragmentation by agents.
6. **ESLint Optimization**: To avoid `no-useless-assignment` errors, prefer using ternary operators or immediate-return logic instead of initializing variables with `null` and assigning them within `if/else` blocks.
7. **Database Parity**: Automated sync of SQL migrations via the Vite build process is mandatory. Always verify that `src/logic/db/migrations_data.js` is regenerated after schema changes.
8. **Automated Repair Safety (Click Propagation)**: Repair scripts MUST NOT inject `.stop` modifiers into components that rely on event bubbling (e.g., `PVTooltip`). Blocking propagation in tooltips breaks interaction with parent containers (like MapCards). Components of this type must be explicitly exempted in `fix_hybrid_patterns.py`.
9. **Multi-line Tag Auditing**: Audit scripts must account for HTML tags starting on one line and finishing on another (multi-line attributes) to avoid false positives on native attributes like `title`.
10. **Complex SVG Robustness**: Audit regex patterns (especially for hybrid pattern detection) must support complex SVGs with multiple attributes and internal `>` characters to avoid false positives on legitimate pixelated content.
11. **Store-Level Event Listeners**: Window listeners used in Pinia stores (outside of the Vue component lifecycle) MUST be marked with `// [PureVue-Ignore]` if they cannot be easily replaced by standardized composables.
12. **Computed Atomicity**: NEVER perform state mutations (e.g., `ref.value = ...`) inside a `computed` property. This causes `vue/no-side-effects-in-computed-properties` errors and architectural instability. Use `watch` or `ref` updates instead.
13. **Diagnostic Data Warnings**: Core engine logic (Capture, Damage, Status) MUST implement `console.warn` fallbacks for missing critical Pokémon properties (e.g., `catchRate`). Use the `??` operator to provide a safe default while signaling the data gap to the developer.
14. **Data Structure Refactoring Safety**: Al migrar una estructura de datos crítica (ej: de `Array` a `Object`), es **OBLIGATORIO** realizar un barrido completo del codebase buscando métodos incompatibles como `.includes()`, `.forEach()`, `.map()`, o `.filter()`.
    - **Validación**: Reemplaza estos métodos por verificaciones de clave (`!!obj[id]`), iteraciones de llaves (`Object.keys(obj).forEach`) o accesos directos según corresponda para evitar `TypeErrors` en tiempo de ejecución.

