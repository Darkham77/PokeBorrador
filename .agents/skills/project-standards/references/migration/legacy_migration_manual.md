# Legacy Migration and Reference Manual

This manual governs the process of modernizing pre-Vue code into the current Poké Vicio architecture, maintaining 1:1 visual parity.

## 📂 Reference Sources

- The original code is located in `backup_legacy_code/`.
- Use it to compare battle formulas, visual assets, or behaviors that have suffered regressions in the Vue version.

---

## 🏛️ Migration Protocol (Migrator-Legacy-Vue)

### 1. Strict Visual Parity

- Each migrated component must be identical to the original in terms of pixel-art, alignment, and animations.
- "Improving" assets during migration without approval is prohibited; the goal is operational stability.

### 2. Logic Isolation

- Extract logic from legacy `.js` files into Vue 3 composables (`src/logic/` or `src/composables/`).
- Keep logic files under 500 lines (Golden Rule).

### 3. Regression Verification

After migrating a critical module (e.g., the box system or inventory):

- Compare behavior with the legacy unit test script: `node backup_legacy_code/unit_test_battle.js`.
- Verify that the save state persists correctly between versions.

---

## 🚨 Reference Rules

- **Prohibition of "Islands"**: Do not create new styling systems if a global mixin exists in `src/assets/styles/`.
- **Change Detection**: If you discover legacy logic that contradicts current standards (e.g., an obsolete damage calculation), ALWAYS prioritize the standard documented in `project-standards`.
