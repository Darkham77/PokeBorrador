# Purpose

Manage styling tokens, visual system designs, SCSS mixins, views layout configurations, and component themes.

## Ownership

UI / Frontend Developers.

## Local Contracts

- **SASS Trap Engine Compliance**: All standard CSS/SASS capitalization transformations are automatically processed during Vite builds by the traps plugin. Standard lowercase functions are completely acceptable in the source files.
- **SASS @use Import Mandate**: Direct `@import` rules are prohibited. All imports must utilize `@use` or `@forward` namespaces.
- **Zero Global Clashing**: View-specific style files (`src/styles/views/`) must avoid overriding base styles using `!important` unless strictly verified to prevent layout regressions on nested visual structures.

- Keep design variables (such as palette colors or border-radius configurations) centralized under `tokens/` and `core/` files.
- Visual properties that vary dynamically with component states must prefer CSS variables injected via `:style` properties rather than deep selectors.
- **Responsive Aspect-Ratio & Tooltip Wrappers**: When using `aspect-ratio` on responsively scaling items, always define explicit height or width bounds (e.g., matching height on desktop, and `height: auto !important` on mobile/stacking viewport) alongside calculated bounds `width: min(100%, calc(Hpx * aspect-ratio)) !important` to override browser flexbox calculation quirks. If wrapping inside tooltips like `PVTooltip`, force the wrapper to use `align-items: stretch !important` to prevent child height collapses. Unify all adjacent flexible items under a single matching media query breakpoint to avoid layout sync drifts.
- **Unitless Variable Pattern**: When passing dynamic coordinates or sizes from JS/TS variables to CSS variables, pass pure numeric values. In CSS, add units using `calc(var(--val) * 1px)`.
- **CSS Variable Propagation**: When using CSS variables to pass dynamic states (like grade colors) from JS to CSS, inject them via the `:style` attribute on the component's root element. Avoid using Vue SFC `v-bind` in CSS for variables that need to be accessed by parent elements, as Vue generates unique internal variable names that break CSS inheritance.
- **CSS Pseudo-Class Scope Limit (`:deep`)**: Vue `:deep` selectors are only compiled inside scoped Vue components (`<style scoped>`). Using `:deep` inside global, nested, or manual SCSS files loaded outside scoped Vue contexts is strictly prohibited as it triggers parser and minification warnings.

## Reference Manuals

- [sass_styling_manual.md](../../.agents/skills/project-standards/references/technical/sass_styling_manual.md): SASS syntax traps and namespaces.
- [gpu_optimization_manual.md](../../.agents/skills/project-standards/references/technical/gpu_optimization_manual.md): Rendering optimizations and layers promotion.
- [low_power_mode_manual.md](../../.agents/skills/project-standards/references/technical/low_power_mode_manual.md): Power saving rendering rules.

## Child DOX Index

- [components/](./components/AGENTS.md): Component-level specific visual styling definitions.
- [core/](./core/AGENTS.md): System base configurations, typography overrides, and mixins.
- [layouts/](./layouts/AGENTS.md): Standard grid shells and flex layouts.
- [tokens/](./tokens/AGENTS.md): Centralized variables, colors, sizing, and animations constants.
- [views/](./views/AGENTS.md): Route-view level fullpage styles.
