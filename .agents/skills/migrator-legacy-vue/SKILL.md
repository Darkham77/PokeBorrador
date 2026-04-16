---
name: migrator-legacy-vue
description: MANDATORY skill for migrating legacy code from `backup_legacy_code/` to Vue 3. triggers when user asks to "migrar", "modernizar", or "restaurar" legacy features. Guarantees 1:1 visual parity and strict project standards.
---

# Migrator Legacy Vue

Goal: Port and **MODERNIZE** legacy JavaScript/CSS/HTML logic from the `backup_legacy_code` archive into the modern Vue 3 architecture. While visual fidelity must be absolute, the underlying code **MUST** be updated to meet all current project standards.

## Core Mandate: Visual Parity 1:1

You **MUST** preserve the original aesthetic exactly as it was in the legacy version.

- **FORBIDDEN**: Modifying colors, fonts, sizes, positions, margins, padding, or texts.
- **ALLOWED**: Improving animations and transitions using **GPU-accelerated** techniques (`transform: translate3d/scale/rotate`, `opacity`). You are encouraged to **INNOVATE** by adding new special effects (FX) that didn't exist in the legacy version, such as explosions, dynamic lights/shadows, particle effects on capture or death, and micro-interactions on hover/click. Avoid animating layout properties like `top`, `left`, `width`, or `height`.

## Required Workflow

Every migration task **MUST** follow these phases. Do not skip any phase.

### Phase 1: Deep Audit & Comparison

1. Locate the legacy source in `backup_legacy_code/`.
2. Compare with the current state in `src/` using `@/legacy-code-reference`.
3. Identify missing logic, styles, or assets.

### Phase 2: Architectural Plan

1. Create a phased execution plan that breaks down the migration into manageable chunks.
2. Define how legacy logic (global functions) will be converted to:
   - **Composables** (logic reuse, reactive state). See `@/vue-best-practices`.
   - **Pinia Stores** (global state). See `@/vue-pinia-best-practices`.
   - **Components** (UI structure). See `@/vue-router-best-practices`.

### Phase 3: Implementation

1. Migrate styles to SCSS partials, using `@/project-standards-checker` to ensure modularity.
2. Implement components using the **Composition API** (`<script setup>`).
3. Ensure no single file exceeds **500 lines** (strictly enforced by `@/project-standards-checker`). If needed, extract logic into separate files in `src/logic/` or `src/composables/`.

### Phase 4: Verification

1. Run `npm run lint` and `npm run build` to ensure project stability.
2. Use `@/vue-debug-guides` if you encounter reactivity or lifecycle issues.
3. Validate visual parity against the legacy CSS/HTML using `@/testing-best-practices`.

## Standards Compliance

Legacy code **MUST** be modified during migration to comply with all current project standards. Migrating non-compliant code without updates is **FORBIDDEN**.

- **Modern Patterns**: Replace direct `supabase.from` calls with `DBRouter.from`, implement session uniqueness, and follow cache invalidation rules defined in `@/project-standards-checker`.
- **No Hardcoded Styles**: Use SCSS tokens. If the code is being migrated to a Vue component, implement styles using Vue standards (scoped `<style lang="scss">`, reactive classes `:class`, or computed `:style` for dynamic values). If it's not a component yet, extract all legacy inline styles to modular SCSS partials.
- **Modularity**: Every new file must pass the 500-line audit. If a legacy script is too large, it **MUST** be split into multiple logic modules or composables.
- **Type Safety**: Use TypeScript where possible or JSDoc if the project is JS-only.

## Example Invocations

- "Migra el sistema de misiones del código viejo."
- "Restaura la estética original del menú de batalla."
- "Pasa el archivo pvp.js de public a un composable de Vue."
