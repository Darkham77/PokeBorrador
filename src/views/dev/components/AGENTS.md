# Purpose

Reusable developer calibration and diagnostic components for internal dev tools.

## Ownership

Frontend Developers & Asset Pipeline Engineers.

## Local Contracts

- **Canonical Component Reuse Mandate**: Components in this folder (e.g. `ShadowEditorCard.vue`) MUST reuse canonical production components (`CombatShadow.vue`) instead of introducing ad-hoc fake canvas circles or bifurcated shadow renderers.
- **Direct Interaction & High Contrast**: Provide 1:1 direct pointer dragging relative to sprite frame containers alongside precise sliders, numeric inputs, and copy/paste buttons.
- **Zero Inline Transitions**: Avoid manual CSS `transition:` on animated layers to prevent input lag during direct pointer manipulation.
- `DevShadowHeaderToolbar.vue`: Top header and rebuild progress banner with global shadow calibration sliders and compilation controls.
- `DevShadowFilterBar.vue`: Secondary filter bar with category tabs, generation/gender dropdowns, and search controls.

## Work Guidance

- Keep card sizing and aspect ratios uniform across all entities.
- Wrap all rendered emojis in `<span class="emoji">` for consistent cross-browser baseline alignment.
- Coordinate Z-index tokens via project standard variables (`calc(var(--z-base) + N)`).

## Verification

- `npm run test tests/unit/dev/shadow_editor.spec.ts`
- `npm run lint`
