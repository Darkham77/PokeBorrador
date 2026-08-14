# Purpose

Manage the visual user interface components, ensuring they align with the Hybrid Retro-Modern style of the Poke Vicio project.

## Ownership

Frontend UI Developers / UI Designers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](../../.agents/skills/project-standards/references/core/ui_ux_standards.md) and [sass_styling_manual.md](../../.agents/skills/project-standards/references/technical/sass_styling_manual.md).
- Zero template-level database queries or heavy computations.

## Work Guidance

- Use `@include pixelated` for retro assets (sprites, badges) to keep them sharp.
- Set container `image-rendering: pixelated` when rendering canvas or pixelated backgrounds.
- Prevent font layout clipping on pixelated fonts (`Pokemon FireRed LeafGreen`) by setting `line-height` to at least `1.5` or `1.6` and adding top padding.
- Implement micro-animations and state hover transitions exclusively using GSAP timelines/tweens in `@mouseenter` and `@mouseleave` handlers. CSS `transition` and `@keyframes` are forbidden for dynamic state transitions.
- Teleported tooltips must scale the inner wrapper, not the parent, to avoid breaking absolute calculations.
- **Overlapping Sprite Stacking (Cards Deck)**: In reward grids or sprite lists, use negative margins (e.g. `margin-left: -16px` on sibling `.item-sprite` elements) to create an overlapping deck. Animate on hover via GSAP to scale (`scale(1.2)`), lift (`translateY(-4px)`), and raise the z-index (`z-index: 10`).
- **Retro Font Layout Clipping Prevention**: For text using `Pokemon FireRed LeafGreen` in containers with `overflow: hidden`, set `line-height` to `1.5` or `1.6` and add top padding. For `<input>` elements specifically, use `font-size: 12px` + `line-height: 1.5` + symmetric `padding: 10px 14px` to prevent glyph top-clipping.
- **GPU & Rendering Integrity**: Promotion via `will-change` must be context-aware; only add it if a `filter` or `transform` is present and no other `will-change` exists within the same block (500-char window). Ensure status effects (Burn, Poison) override persistent auras (Guardian, Shiny) via mutually exclusive logic instead of superimposing them.
- **GSAP Filter Order**: When animating multiple filters in custom sprite FX, apply lighting filters (`Brightness`, `Contrast`) BEFORE outline or glow filters (`feMorphology`, `Drop-Shadow`) to prevent the effects from getting washed out.
- **Organic Feel**: Weather animations must pass the synced weather seed (`getWeatherAnimSeed` function) as `:anim-seed` (never `:seed`) to `<AtmosphereLayer>`. Terrain in `CombatGrass.vue` must generate a new random seed per battle to inject scale (0.7x to 1.5x), horizontal flip, and offset variations.
- **Zero Heavy Logic in Vue Templates**: Accessing databases, data providers, or performing `.map`, `.filter`, `.reduce` in templates is strictly prohibited. All data must be resolved in `<script>` and cached using computed properties or mapped helpers.
- **GSAP for Progress Indicators**: Animate progress bars smoothly using a reactive ref watched and bound with GSAP (`gsap.to`), not with manual CSS transitions.
- **Pure Vue Compliance**: Avoid direct DOM/Canvas operations in Vue components. For mandatory low-level canvas/DOM code, use `// [PureVue-Ignore]`, `// [PureVue-Ignore-Length]`, or `// [PureVue-Ignore-Aesthetics]` to bypass automated audits.
- **Template Event Casting & Fallbacks**: Cast event targets in the template (e.g. `(e.target as HTMLImageElement)`) to satisfy strict TypeScript. Always implement a fallback error handler like `@error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"` on images that may be missing.
- **Style Consolidation & Visual Extraction**: When modularizing visual components to stay under the 1000-line limit, extract data/configuration dictionaries to external `.ts` files (e.g., `fx-configs.ts`) and extensive stylesheet blocks to external SCSS files.
- **Decoupled FX**: Trigger non-critical visual animations or multi-component effects via `GameBus.emit()` to avoid direct dependencies.
- **Strict DB-to-UI Comparison**: When writing UI conditionals dependent on database models, compare against official database string values in Spanish (e.g., `'poder'` instead of `'power'`).
- **Form Selectors Localization**: Selector components must store and bind English Showdown IDs internally while presenting and allowing search by their localized Spanish translations in the UI.
- **Modal Metadata**: Full-screen experiences or overlays that obscure the background must be registered in the `MODAL_METADATA` registry using standard flags (`isFullscreen`, `obscuresBackground`) instead of name comparisons in stores.
- **Tooltip Layout and Grid Closures**: When adding layout blocks inside tooltips, ensure that CSS grid wrappers (such as `.combat-stats-grid`) are closed immediately before rendering block/flex containers. Mismatched tag closures will force subsequent elements to render as grid columns, compressing the layout.
- **Text Wrapping & Overlapping Prevention**: For percentage lists, HP ranges, or status descriptions inside compact flex/grid containers, set `white-space: nowrap` and use a `line-height` of at least `1.2` to prevent words from wrapping and overlapping on line heights.

## Verification

- Run `npm run audit:warnings-diff` to verify component type safety, syntax, and project rules.
- Visual inspection in browser across different resolutions (using mobile viewport targets if necessary).

## Child DOX Index

- [admin/](./admin/AGENTS.md): Domain module documentation for admin.
- [adventure/](./adventure/AGENTS.md): Domain module documentation for adventure.
- [auth/](./auth/AGENTS.md): Domain module documentation for auth.
- [battle/](./battle/AGENTS.md): Domain module documentation for battle.
- [box/](./box/AGENTS.md): Domain module documentation for box.
- [breeding/](./breeding/AGENTS.md): Domain module documentation for breeding.
- [common/](./common/AGENTS.md): Domain module documentation for common.
- [events/](./events/AGENTS.md): Domain module documentation for events.
- [evolution/](./evolution/AGENTS.md): Domain module documentation for evolution.
- [game/](./game/AGENTS.md): Domain module documentation for game.
- [gyms/](./gyms/AGENTS.md): Domain module documentation for gyms.
- [inventory/](./inventory/AGENTS.md): Domain module documentation for inventory.
- [map/](./map/AGENTS.md): Domain module documentation for map.
- [market/](./market/AGENTS.md): Domain module documentation for market.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [overlays/](./overlays/AGENTS.md): Domain module documentation for overlays.
- [pokedex/](./pokedex/AGENTS.md): Domain module documentation for pokedex.
- [pokemon/](./pokemon/AGENTS.md): Domain module documentation for pokemon.
- [pokemon-detail/](./pokemon-detail/AGENTS.md): Domain module documentation for pokemon-detail.
- [profile/](./profile/AGENTS.md): Domain module documentation for profile.
- [shared/](./shared/AGENTS.md): Domain module documentation for shared.
- [social/](./social/AGENTS.md): Domain module documentation for social.
- [team/](./team/AGENTS.md): Domain module documentation for team.
- [ui/](./ui/AGENTS.md): Domain module documentation for ui.
- [war/](./war/AGENTS.md): Domain module documentation for war.
