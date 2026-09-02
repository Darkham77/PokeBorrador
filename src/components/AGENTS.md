# Purpose

Manage the visual user interface components, ensuring they align with the Hybrid Retro-Modern style of the Poke Vicio project.

## Ownership

Frontend UI Developers / UI Designers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](../../.agents/skills/project-standards/references/core/ui_ux_standards.md) and [sass_styling_manual.md](../../.agents/skills/project-standards/references/technical/sass_styling_manual.md).
- Zero template-level database queries or heavy computations.
- **Interactive Elements Deterministic ID Mandate**: Every interactive UI control (`<button>`, `<input>`, `<select>`, `<textarea>`, or elements binding `@click`/`@change`) MUST define an explicit static or dynamic `id` attribute (e.g. `id="nav-events-btn"` or `:id="'claim-btn-' + item.id"`). Locating elements by text or CSS class hierarchy in automated tests is strictly forbidden.

## Work Guidance

- **Pixel Art Typography & Button Weights**: Pixel fonts (`Pokemon FireRed LeafGreen`, etc.) MUST NEVER be styled with synthetic `font-weight: bold` or `font-weight: 700`. Doing so renders blurred double-stroke outlines that destroy pixel-grid alignment. Highlighting on pixel buttons must be achieved via color gradients, distinct borders (`var(--border-relief)`), or text-shadows, never font-weight inflation.
- **Modal Overlays & Close Buttons Standardization**: Debug and admin panels MUST use standard modal close button classes (`.modal-close-btn`), standard modal step z-index variables (`var(--z-modal-step)` / `var(--z-modal)`), and tokenized SCSS colors to ensure consistent layering and responsive click targets across all viewports.
- Use `@include pixelated` for retro assets (sprites, badges) to keep them sharp.
- Set container `image-rendering: pixelated` when rendering canvas or pixelated backgrounds.
- Implement micro-animations and state hover transitions exclusively using GSAP timelines/tweens, `v-gsap-hover`, `useGsapTransition`, or `@mouseenter`/`@mouseleave` handlers. CSS `transition` and `@keyframes` are forbidden for dynamic state transitions. When auditors flag non-compliant CSS transitions/keyframes, NEVER delete them without replacement; ALWAYS migrate them to GSAP equivalents preserving 1:1 visual fluidity and feel.
- **GSAP Image & Banner Hover Zoom**: For cards or widgets containing artwork banners (`.banner-box img`, `.pokecenter-banner .banner-bg`), the inner image zoom must be animated exclusively through GSAP (`gsap.to(img, { scale: 1.04, duration: 0.35, ease: 'power2.out' })` and `clearProps: 'transform,scale'`) within `@mouseenter`/`@mouseleave` handlers or GSAP directives. Leaving static CSS `:hover` scale rules without transitions is strictly prohibited as it triggers abrupt visual snapping.
- Teleported tooltips must scale the inner wrapper, not the parent, to avoid breaking absolute calculations.
- **Overlapping Sprite Stacking (Cards Deck)**: In reward grids or sprite lists, use negative margins (e.g. `margin-left: -16px` on sibling `.item-sprite` elements) to create an overlapping deck. Animate on hover via GSAP to scale (`scale(1.2)`), lift (`translateY(-4px)`), and raise the z-index (`z-index: 10`).
- **Retro Font Layout Clipping Prevention**: For text using `Pokemon FireRed LeafGreen` in containers with `overflow: hidden`, set `line-height` to `1.5` or `1.6` and add top padding. For `<input>` elements specifically, use `font-size: 12px` + `line-height: 1.5` + symmetric `padding: 10px 14px` to prevent glyph top-clipping.
- **Pixel Font Side-Bearing Padding with `overflow: hidden`**: Pixel art fonts (`Pokemon FireRed LeafGreen`) have zero or negative side bearings on curved glyphs (`C`, `O`, `G`, `D`). Whenever applying `overflow: hidden; white-space: nowrap; text-overflow: ellipsis;` to compact HUD labels or badges, components must provide at least `padding-left: 2px;` and standard `line-height: 1.35;` to prevent the rendering engine from clipping the first pixel column of the glyph.
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
- **Mobile Touch Drag-and-Drop & Auto-Scroll Containment**: Draggable team slots and gridded cards must set `touch-action: none` to prevent browser gesture cancellation (`pointercancel`). When auto-scrolling during drag-and-drop within a scrollable modal container, lock `maxScroll` to the initial pre-drag `scrollHeight - clientHeight` to prevent dynamic transform expansion from allowing infinite scrolling.
- **Card Selection & Details Separation**: In team and pokemon management modals, slot drag-and-drop or card clicking on occupied slots must not inadvertently trigger the Pokémon details modal; details modal opening must be strictly reserved for explicit action buttons (`DATOS`).
- **OffscreenCanvas Lifecycle & Non-Destructive Visibility**: Visual atmosphere and weather particle layers powered by Web Workers and `OffscreenCanvas` (`AtmosphereLayer.vue`) MUST use non-destructive visibility (`v-show="shouldRenderAtmosphere"`) instead of `v-if`. Destroying canvas DOM elements permanently breaks the detached `OffscreenCanvas` context transferred to the worker. All rendering eligibility guards MUST be consolidated into pure computed properties (`shouldRenderAtmosphere`) rather than repeating compound conditionals across watchers and lifecycle hooks.
- **Event Modal Hierarchy & Dynamic Showcase**: Event details and modal headers (`EventDetailModal.vue`) MUST prioritize the schedule block (`⏰ HORARIO`) immediately following the title and description, before bonuses and prize tiers. If specific Pokémon species are involved in the event (`cfg.species`, target bonuses, or competition prizes), the header MUST display an animated sprite showcase (`PVSpriteFX`). When multiple species are involved, rotate smoothly through them in sequence (every 2.5s via GSAP); if no species are involved, hide the showcase container completely to preserve clean pixel hierarchy. For all-day events, schedules must display `Todo el día` rather than redundant 24h ranges.
- **Extracted Component Scoped Style Linkage Mandate**: When modularizing views, modals, or parent cards into smaller child `.vue` components (e.g. sub-competitions, radar HUDs, shop item cards), parent `<style scoped>` rules DO NOT penetrate nested elements of child components (they only apply to the child root node). Extracted child components MUST have an explicit `<style scoped lang="scss" src="...">` link, local `<style>` block, or `@use` stylesheet import to prevent unstyled UI regressions. This rule is automatically validated across the entire codebase via `npm run validate:component-styles` and `npm run lint`.
- **Universal `.emoji` Class Architecture & Layout Container Centering**: All Unicode emojis, pictographs, symbols, and geometric glyphs rendered in Vue SFC templates MUST be encapsulated in `<span class="emoji">`.
  1. **Universal Master Class (`.emoji`)**: Single source of truth for emoji typography isolation (`"Apple Color Emoji"`, `"Segoe UI Emoji"`, `"Noto Color Emoji"`), setting `display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; vertical-align: middle !important;`. Legacy classes (`.btn-emoji`, `.emoji-inline`) are deprecated and superseded by `.emoji`.
  2. **Co-existing Utility Classes**: Secondary functional classes (e.g. `.arrow`, `.medal`, `.dir-icon`, `.title-icon`, `.info-badge`, `.empty-icon`) may co-exist on the same element alongside `.emoji` to control contextual font-size, rotation transforms, transitions, or opacity without conflicting with universal typography.
  3. **Pixel Font Container Flex Mandate**: In pixelated typography contexts (`Pokemon FireRed LeafGreen`, `@include pixelated`), inline `vertical-align: middle` causes glyphs to hang below the text due to small x-height. Containers pairing pixel text/numbers with emojis (e.g. `.chip-value`, `.vigor-val`, value chips) MUST declare `display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: Xpx; line-height: 1;` so flexbox centers both bounding boxes along the cross-axis.
  4. **Dedicated Emoji Props over String Concatenation**: Components and modal headers (`BaseModal`, `RouteSpawnsTable`, `DebugIllegalModal`) MUST expose dedicated `emoji?: string` / `icon?: string` props rather than embedding emojis inside plain text properties (e.g. `title="💊 CENTRO POKÉMON"`). The component template encapsulates the glyph in `<span class="emoji">` inside a flexbox header container.
  5. **Emoji-As-Bullet Standard for List Items**: When rendering bullet lists where items are prefixed with emojis (e.g. player class bonuses, penalties, perk lists), DO NOT duplicate CSS bullet dots (`•` via `&::before` or `list-style: disc`) alongside the emoji. The emoji MUST serve as the sole bullet (`.bullet-item-flex`) in an aligned flexbox container (`display: flex; align-items: flex-start; gap: 6px;`) with a fixed icon bounding box and separate text node.
  6. **Zero Ad-Hoc Style Injections**: Local manual translates (`transform: translateY(...)`) or margin hacks to force emoji alignment are strictly forbidden. Enforced repository-wide via `npm run validate:emojis` (0 errors across all 274 Vue components).
- **Box & Drawer Range Sliders Usability Standard**: Filter drawers for Pokémon storage and markets MUST prioritize continuous numeric range sliders (Friendship 0..255, Individual EVs 0..252 with `step="4"`, Level 1..100, IVs 0..31) over redundant discrete tier pills, ensuring precision for competitive builds without cluttering the UI.
- **Empirical DOM `scrollWidth` for Dynamic Text Fitting**: Dynamic text fitting algorithms (such as `fitText` in `InventoryPills.vue` or header counters) MUST measure the physical DOM element (`el.scrollWidth > maxW`) rather than relying on offscreen Canvas 2D contexts (`measureText`) with synthetic font weights. Custom `@font-face` pixel fonts with `size-adjust: 128%` lack bold font files; Canvas requests for `bold` silently fall back to system monospace fonts with narrower widths, causing false positives and text truncation in the real DOM.
- **GSAP Animation Transform Freedom**: When choreographing component micro-interactions with GSAP (`useMapCardAnimations`, `HUD_Navigation`), never restrict target elements with `transform: none !important` in scoped or shared stylesheets. When animating sub-elements (e.g. rotating an icon inside a pill), apply the GSAP tween to the inner icon selector, and when bobbing a full button container, apply it to the outer container without interfering with flex child alignments.
- **Interactive Container Image Drag & Selection Prevention**: All `<img>` elements rendered inside gesture-interactive containers, draggable carousels, or clickable cards MUST declare `draggable="false"` in the HTML template and specify `user-select: none; -webkit-user-drag: none;` in stylesheets. Decorative or background artwork (`.banner-box img`) within clickable cards MUST set `pointer-events: none;` to ensure pointer and mouse gesture events pass directly to the parent container without triggering native browser ghost image dragging.
- **Vector Icons Mandate for Interactive UI Controls**: Navigation buttons, carousel pagination controls, refresh triggers, and collapsible accordion toggles MUST use crisp FontAwesome vector icons (`<i class="fas fa-chevron-left" />`, `<i class="fas fa-sync-alt" />`, `<i class="fas fa-chevron-down" />`) or SVGs rather than raw Unicode emoji characters (`◀`, `▶`, `▲`, `▼`, `↻`). This prevents mobile operating systems (iOS/Android) from overriding monochrome glyphs with system-colored rectangular box emojis.
- **Orphan Component Purge**: When components are superseded by unified modals or removed from view routing, proactively delete the `.vue` file, associated SCSS tokens, and obsolete type definitions, while immediately updating child DOX indices.

## Verification

- Run `npm run audit` to verify component type safety, syntax, and project rules.
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
- [home/](./home/AGENTS.md): Domain module documentation for home.
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
