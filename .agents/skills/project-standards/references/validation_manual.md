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
4. **Audit Bypass**: If a violation is intentional by design, use the `// [PureVue-Ignore]` comment on the affected line.
5. **Large Data Integrity**: Massive data files (e.g., spawn grids) must carry `// [PureVue-Ignore-Length]` at the beginning to avoid fragmentation by agents.
6. **ESLint Optimization**: To avoid `no-useless-assignment` errors, prefer using ternary operators or immediate-return logic instead of initializing variables with `null` and assigning them within `if/else` blocks.
7. **Database Parity**: Automated sync of SQL migrations via the Vite build process is mandatory. Always verify that `src/logic/db/migrations_data.js` is regenerated after schema changes.
8. **Automated Repair Safety (Click Propagation)**: Repair scripts MUST NOT inject `.stop` modifiers into components that rely on event bubbling (e.g., `PVTooltip`). Blocking propagation in tooltips breaks interaction with parent containers (like MapCards). Components of this type must be explicitly exempted in `fix_hybrid_patterns.py`.
