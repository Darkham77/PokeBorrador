# Purpose

Manage styling tokens, visual system designs, SCSS mixins, views layout configurations, and component themes.

## Ownership

UI / Frontend Developers.

## Local Contracts

- **SASS Trap Engine Compliance**: All standard CSS/SASS capitalization transformations are automatically processed during Vite builds by the traps plugin. Standard lowercase functions are completely acceptable in the source files.
- **SASS @use Import Mandate**: Direct `@import` rules are prohibited. All imports must utilize `@use` or `@forward` namespaces.
- **Zero Global Clashing**: View-specific style files (`src/styles/views/`) must avoid overriding base styles using `!important` unless strictly verified to prevent layout regressions on nested visual structures.
- **Native CSS Virtualization (`content-visibility`)**: Long scrollable lists and repeating card grids (Pokédex cards, inventory items, spawn report tables) MUST specify `content-visibility: auto; contain-intrinsic-size: 0 <height>;` to allow the browser engine to skip off-screen layout and sprite decoding, guaranteeing 60 FPS scrolling.
- **Prohibition of Unscoped Component Classes in Global Layouts**: Global layout stylesheets (`src/styles/layouts/` such as `_screens.scss`, `_hud.scss`) MUST NOT define component-specific classes (`.pc-left`, `.pc-right`, `.pc-banner-*`). All component-level styling rules must reside exclusively in dedicated modular component stylesheets (`src/styles/components/`) to prevent global cascade collisions that silently break component layout sizing.
- **Prohibition of `transform: ... !important` on GSAP-Animated Elements**: Stylesheets MUST NEVER declare `transform: none !important` or static `transform: ... !important` on elements or containers targeted by GSAP animations (e.g., `.map-pill`, `.interactive-pill`, `.location-tag`, `.faction-status-pill`, `.dom-badge`). CSS `!important` overrides inline styles injected by GSAP, completely freezing animations. All badge and pill centering MUST rely exclusively on clean flexbox properties (`display: flex; align-items: center; justify-content: center; line-height: 1; font-family: ...`) without static transforms.
- **FontAwesome Webfont & Universal `.emoji` Font Isolation Mandate**: Global emoji font-family rules (`"Apple Color Emoji"`, `"Segoe UI Emoji"`, `"Noto Color Emoji"`) in `src/styles/core/_base.scss` MUST isolate FontAwesome webfonts using `.emoji:not(i):not([class*="fa"])`. Global stylesheets MUST NEVER apply generic wildcard attribute selectors (such as `[class*="-icon-"]` or `[class$="-icon"]`) with `font-family: ... !important`, as doing so overrides FontAwesome's private-use-area Unicode glyphs, breaking vector icons into empty boxes (`▯`/tofu).
- **Universal `.emoji` Class & Natural Flexbox Alignment**: The universal master class `.emoji` is the sole standard for rendering emojis, symbols, and glyphs across the codebase. Component markup encapsulates all emoji characters in `<span class="emoji">` (or `<span class="emoji <sub-class>">`). Container elements combining pixel text with emojis must be styled with `display: inline-flex; align-items: center; gap: Xpx; line-height: 1;` with sufficient specificity to ensure cross-axis mathematical centering without manual pixel offset hacks.
- **Mandatory GSAP Migration over Deletion Mandate**: Manual CSS transitions (`transition: ...`) and `@keyframes` flagged by style auditors MUST NOT be deleted or stripped into lifeless static styles. They MUST be migrated to GSAP (`v-gsap-hover`, `useGsapTransition`, `gsap.to()`, GSAP timelines) preserving full interactive motion and visual delight.

## Work Guidance

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

- [components/](./components/AGENTS.md): Domain module documentation for components.
- [core/](./core/AGENTS.md): Domain module documentation for core.
- [layouts/](./layouts/AGENTS.md): Domain module documentation for layouts.
- [tokens/](./tokens/AGENTS.md): Domain module documentation for tokens.
- [views/](./views/AGENTS.md): Domain module documentation for views.
