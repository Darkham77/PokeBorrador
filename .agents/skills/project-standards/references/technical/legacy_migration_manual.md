# Legacy Migration and Reference Manual

> **Scope & Authority**: This manual governs the modernization of pre-Vue code into the current Poké Vicio Vue 3 + Pinia + GSAP architecture, maintaining 1:1 visual and behavioral parity.
> **Sources of Truth**:
> - Skill: `@/migrator-legacy-vue` (`.agents/skills/migrator-legacy-vue/SKILL.md`)
> - UI Standards: [`../core/ui_ux_standards.md`](../core/ui_ux_standards.md)
> - Animation Standards: [`../battle/animation_standards.md`](../battle/animation_standards.md)

---

## 1. 📂 Reference Sources

- Use legacy references to compare battle formulas, visual assets, or behaviors that have suffered regressions in the Vue version.

---

## 2. 🏛️ Migration Protocol (Migrator-Legacy-Vue)

### 1. Strict Visual Parity
- Each migrated component must be identical to the original in terms of pixel-art, alignment, and animations.
- "Improving" assets during migration without approval is prohibited; the goal is operational stability.

### 2. Logic Isolation
- Extract logic from legacy `.ts` files into Vue 3 composables (`src/logic/` or `src/composables/`).
- Keep logic files under 500 lines (Golden Rule).

### 3. Regression Verification
After migrating a critical module (e.g., the box system or inventory):
- Compare behavior with legacy test cases if available.
- Verify that the save state persists correctly between versions.

### 4. Architectural Parity & Animation Coordination
When modernizing complex interactive screens or mini-games (e.g., Fossil Cloning, Daycare, etc.):
- **Reactivity Model**: Always use Vue 3 Composition API (`<script setup>`) with strict types, avoiding legacy options-api wrappers or untyped structures.
- **Workflow Coordination**: Visual state progressions and animations **MUST** be synchronized via GSAP timelines and promises, avoiding any mixing of standard CSS transitions or manual `setTimeout` timers to prevent race conditions during state transitions.

---

## 3. 🚨 Reference Rules

- **Prohibition of "Islands"**: Do not create new styling systems if a global mixin exists in `src/assets/styles/`.
- **Change Detection**: If you discover legacy logic that contradicts current standards (e.g., an obsolete damage calculation), ALWAYS prioritize the standard documented in `project-standards`.
