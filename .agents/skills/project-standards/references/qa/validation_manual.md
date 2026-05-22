# Validation and Quality Manual (Poké Vicio)

This manual centralizes all automatic validation protocols to ensure that code and data comply with the project's technical rigor standards.

## ⚔️ Battle and Pokémon Data Validation

### 1. Moves (`MOVE_DATA`)

Any change in `src/data/moves.ts` or in battle logic must be validated:

- **Full Validation**: `npm run validate:moves` (detects duplicates, semantic errors, and learnset integrity).

### 2. Abilities (`ABILITY_DATA`)

- **General Validation**: `npm run validate:abilities` (verifies descriptions, PokeAPI parity, and implementation in `battleAbilities.ts`).

### 3. Items Integrity

- **Full Audit**: `npm run validate:items` (ensures consistency between `SHOP_ITEMS` and `itemEffects.ts`).

### 4. Battle Engine (FSM)

Any modification to `orchestrator.ts`, `battle.ts`, or the battle state machine MUST pass these audits:

- **Diagram Parity**: `npm run fsm:verify` (detects missing states or broken transitions).
- **Implementation Integrity**: `npm run fsm:audit` (detects race conditions and unimplemented sub-states).
- **Sequential Flow Parity**: `npm run fsm:flow` (ensures the orchestrator follows the manual's Mermaid diagrams 1:1).

---

## 🧪 Testing Standards

Core logic modules and critical system components MUST have dedicated unit tests in `tests/unit/` or `tests/node/`.

1. **Factory Integrity**: Every data factory (e.g., `pokemonFactory.ts`) must be covered by unit tests verifying generation, level-up, and sanitization.
2. **Regression Prevention**: When modifying `src/logic/`, perform a **Test Gap Analysis**; if a module is "worthy" (core behavior), create a new `.spec.ts` file.
3. **Execution**: Run `npm run test` or `npm run test:node` before every commit to ensure 100% pass rate.
4. **Deterministic Environment**: All logic tests dependent on environmental variables (time cycles, seasons, weather) MUST mock `getDayCycle` or `getServerInstant` from `@/logic/timeUtils` to ensure consistent and reproducible results across all timezones and execution hours.

---

## 🛠️ Standards Audit (Unified Engine)

The project uses a unified audit system located in `scripts/audit_project.ts`:

- **Global Audit**: `npm run audit`. Runs all SASS, GPU, and file length checks.
- **Auto-Fix**: `npm run audit:fix`. Repairs common standard violations (Viewports, SASS filters).
- **Full Chain**: `npm run audit:full`. Runs the complete verification chain (Lint + Audit + FSM + Items + Abilities + Moves + SQL).

---

## 🚨 Non-Negotiable Quality Rules

1. **Zero-Warning**: `npm run lint` and `npm run validate:types` MUST return 0 errors and 0 warnings before any commit.
2. **SASS Capitalization (Automated)**: SASS capitalization for CSS filters/transforms (`Scale()`, `Translate()`, etc.) is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build, meaning no manual capitalization or separate linting checks are required.
3. **Dependency Shield**: Any script using external libraries must handle `ImportError` and provide clear installation instructions.
4. **Audit Bypass**: If a violation is intentional by design, use the `// [PureVue-Ignore]` comment. The audit engine checks the **current line and the line immediately above** to support Vue/HTML attributes that span multiple lines.
5. **Large Data Integrity**: Massive data files (e.g., spawn grids) must carry `// [PureVue-Ignore-Length]` at the beginning to avoid fragmentation by agents.
6. **ESLint Optimization**: To avoid `no-useless-assignment` errors, prefer using ternary operators or immediate-return logic instead of initializing variables with `null` and assigning them within `if/else` blocks.
7. **Database Parity**: Automated sync of SQL migrations via the Vite build process is mandatory. Always verify that `npm run validate:sql` passes after schema changes.
8. **Automated Repair Safety (Click Propagation)**: Repair scripts MUST NOT inject `.stop` modifiers into components that rely on event bubbling (e.g., `PVTooltip`).
9. **Maintenance Script Exemption**: Scripts located in `scripts/` are exempt from legacy audits (e.g., `Date` usage) to facilitate technical migrations and support tasks without triggering false positives.
10. **Store-Level Event Listeners**: Window listeners used in Pinia stores (outside of the Vue component lifecycle) MUST be marked with `// [PureVue-Ignore]` if they cannot be easily replaced by standardized composables.
11. **Computed Atomicity**: NEVER perform state mutations (e.g., `ref.value = ...`) inside a `computed` property. This causes `vue/no-side-effects-in-computed-properties` errors.
12. **Data Structure Refactoring Safety**: Al migrar una estructura de datos crítica (ej: de `Array` a `Object`), es **OBLIGATORIO** realizar un barrido completo del codebase buscando métodos incompatibles como `.includes()`, `.forEach()`, `.map()`, o `.filter()`.
13. **TypeScript Import Rigor**: Triple-slash references (e.g., `/// <reference types="vue" />`) are forbidden in `vite-env.d.ts` or any core file. Use standard ESM imports or `compilerOptions.types` in `tsconfig.json`.
14. **Strict Return paths (TS7030)**: When writing functions in configurations or codebases with strict TypeScript enabled, if any execution path returns a value, all paths must explicitly return a value. For example, in rollup configurations like `manualChunks(id)`, ensure unmatched branches end with a fallback `return;` or `return undefined;` to satisfy the `noImplicitReturns` rule.
15. **Unicode Regex for Emojis**: ESLint in strict mode flags character classes containing multiple combined characters (like emojis with modifiers). ALWAYS use alternation groups `(A|B|C)` instead of character classes `[ABC]` for these symbols to avoid `no-misleading-character-class` errors.
16. **Economy Testing Parity**: When modifying `economyFormulas.ts`, all associated tests (e.g., `shop.spec.ts`, `economyFormulas.test.ts`) MUST be updated to reflect the new formulas (e.g., tier-based costs) to prevent false regression signals.
17. **Import Hygiene Post-Refactor**: After refactoring component logic to use global SASS mixins or variables (e.g., centralizing type colors), it is MANDATORY to remove the corresponding legacy imports (e.g., `PDEX_TYPE_COLORS`) and associated helper functions (e.g., `getTypeColor`) in all affected components.
18. **Validation Script Permission Parity**: All `validate:*` scripts in `package.json` that access external APIs (e.g., PokeAPI) and write local cache files MUST have consistent permission flags (`--allow-fs-write=.` + `--allow-net=<domain>`). When adding or modifying a validation script, audit all sibling validators to ensure permission parity and prevent silent failures in offline or restricted environments.
19. **PokeAPI Cache Under Version Control**: The `scripts/.cache/` directory containing PokeAPI response caches (moves, abilities) MUST remain under version control. This ensures that `npm run audit:full` and all `validate:*` scripts can execute successfully without an active internet connection, which is critical for CI environments and offline development.
20. **Mandato del Directorio Scratch**: Cualquier reporte temporal, registro (log), resumen o reporte de auditoría/validación (independientemente de su extensión de archivo: `.txt`, `.log`, `.json`, etc.) que sea generado para su posterior estudio, análisis o revisión, debe ser guardado única y exclusivamente dentro de la carpeta `scratch/` en la raíz del proyecto. Queda terminantemente prohibido dejar o escribir estos reportes temporales en la raíz del proyecto, en carpetas de código fuente o en cualquier otra ubicación arbitraria para mantener la limpieza del repositorio.

