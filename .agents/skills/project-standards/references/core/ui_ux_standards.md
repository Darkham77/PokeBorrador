# UI/UX & Aesthetic Standards

## 🛠️ Vue.ts & Component Standards

To prevent initialization race conditions (TDZ) and ensure reactive stability:

- **MANDATORY Setup Order**: Every `<script setup>` block MUST follow this hierarchical order:
  1. **Refs & Constants**: Base reactive state and static data.
  2. **Computed Properties**: Derived logic and data filtering.
  3. **Watchers & Lifecycle Hooks**: Side effects and event listeners.
- **Emit Shadowing Prevention**: When defining emits in `<script setup>`, avoid naming the returned object `emit` if the component logic or its internal Vue properties might collide. Use context-specific names like `cardEmit` or `modalEmit`.
  - **WHY**: Prevents "not callable" runtime errors and ensures clarity in complex logic blocks.
- **Complex Sub-Component Isolation (SRP)**: Highly interactive sub-elements or dropdowns nested inside complex panels (e.g., the catch ball selection dropdown in combat panels) MUST be isolated into their own dedicated, single-purpose components (e.g., `BattleBallPicker.vue`). This keeps parent layout orchestrators light, maintainable, and prevents violating the 300/500-line rule.
- **Prop-Driven Component Sizing**: Generic cards and items (e.g., `BoxPokemonCard`) MUST accept sizing props (e.g., `typePillSize`) rather than hardcoding CSS logic. This allows parent orchestrators (like `BattleQuickTeam`) to enforce density without breaking the child's encapsulation.
- **WHY**: Ensures that watchers and hooks never attempt to read computed data before its dependencies are fully initialized.
- **Modularity**: Adhere to the **500-line rule** for all UI components. If a view exceeds this, logic must be extracted to composables or sub-components.
- **Explicit Scoping Patterns**: To force styles on child components (e.g., "always small" mode), avoid relying on parent IDs (`#parent .child`) which can be blocked by Vue `scoped` CSS.
  - **MANDATORY**: Pass an explicit class (e.g., `.is-compact`) directly to the child component or use a boolean prop to toggle internal layout classes.
  - **WHY**: Ensures that component-level styles remain predictable and are not ignored by the browser due to scoping data-attributes.

This manual defines the visual identity and interaction patterns of the Poké Vicio project, ensuring a premium **Hybrid Retro-Modern** experience.

---

## ✨ The Hybrid Retro-Modern Mandate

We prioritize a deliberate contrast between modern, sleek UI shells and classic, pixel-perfect content.

### 1. Modern UI Shell (Containers & Layouts)

- **Techniques**: HSL gradients, sharp borders, smooth shadows, and fluid transitions.
- **Goal**: The "frame" must feel premium, solid, and reactive.
- **Dynamic Layout Balance**: Use `flex-wrap: wrap` with flexible bases (e.g., `flex: 1 1 650px`) to create organic responsive transitions that adapt to intermediate viewports (like 1360px) without rigid breakpoints.
- **Hybrid Battle Log Layout (Combat)**:
  - **Desktop (Side-by-side)**: The log MUST use `flex: 1` to fill the entire vertical height of the grid.
  - **Mobile/Stacked (≤ 768px)**: The log MUST switch to a fixed/compact height (Standard: **90px** / ~2 lines) to prevent pushing action controls out of the viewport.
  - **PWA/Split-Screen**: In split-screen mode where height is constrained but width is ample, prioritize `flex: 1` for the chat to fill available vertical space.
  - **Compact Density**: Use minimal `gap` (**2px**) between log entries and reduced `padding` (**4px**) for the main container to maximize information density.
  - **Side-Based Tinting**: Every log entry MUST be visually associated with its side (Player vs Enemy) using a subtle background gradient (`Linear-Gradient` at **0.06 - 0.08** opacity) and a colored `border-left` (2px).
  - **WHY**: Balances deep history readability on large screens with gameplay space protection on small screens while providing instant side-recognition.
- **Log Area & Control Separation**: The combat log area MUST have an independent scrollbar for entry history. Admin/Debug controls (e.g. Shiny/Guardian toggles) MUST be positioned outside the log's scrolling container to ensure they don't block messages or collide with entry animations.
- **Bottom Anchor Precision**: In fullscreen mode, action buttons MUST be positioned with a maximum of `2px` from the bottom edge (or `0px` with a slight negative margin) to ensure they feel physically anchored to the device frame.
- **Zero-Gap Combat HUD**: In high-fidelity combat grids, eliminate vertical gaps between the arena and controls by using `row-gap: 0` and `auto` grid rows.
- **Overlap Technique (-1px)**: Use a `margin-top: -1px` on control panels with dark/gradient backgrounds to prevent "light leaks" (black bars) between sections.
- **Consolidated Premium Shells**: Apply `shell-premium` to the parent layout container (`.battle-controls-layout`) instead of individual sub-zones to ensure a seamless "single block" appearance.
- **HUD Padding Synchronization**: To eliminate layout shifts ("jumps") during page load or HUD transitions, the main content area MUST use dynamic CSS variables (e.g., `--hud-top-padding`) calculated from the HUD's actual height.
  - **Implementation**: Use a `ResizeObserver` or a standardized `updateHudHeight` function in the root view (`MainGameView.vue`).
  - **CSS Usage**: `padding-top: var(--hud-top-padding, 110px);`.
- **HUD Minimal Mandate**: Remove redundant data from the HUD if it is intrinsic to the current route (e.g., weather/cycle). HUD should focus on inventory and resources.
- **Numeric Scaling (`fitText`)**: Values that can grow significantly (e.g., Currency) MUST use dynamic scaling logic to ensure absolute containment within HUD pills.
  - **Robust Measurement**: Always use `parent.clientWidth` (or `parent.offsetWidth - padding`) for `maxW` calculations instead of hardcoded constants. This ensures the text fits regardless of the user's viewport or zoom level.
  - **Large Value Simplification**: If a numeric value exceeds **9,999,999**, simplify it using a suffix (e.g., `10M`, `15M`).
  - **Full Precision Mandate**: When a simplified value is displayed in the UI, the corresponding `PVTooltip` MUST show the full, non-simplified value (e.g., `Saldo: ₱10.500.200`) to ensure transparency.
- **Mobile Fullscreen Mandate**: All complex management modals (Inventory, Team, Shop, Pokedex) MUST switch to `type: 'fullscreen'` on viewports ≤ 950px.
  - **WHY**: Maximizes usable space on small screens and eliminates "floating card" artifacts that reduce visibility.
- **Scroll Delegation (Fullscreen)**: In fullscreen mode, the main modal container MUST use `overflow: hidden`. Scroll responsibility MUST be delegated to an internal `.modal-scrollable-content` (or `.upd-core-body`) with `flex: 1`, `min-height: 0`, and `overflow-y: auto`.
  - **CRITICAL**: Never use `overflow: visible !important` on scroll-delegated containers as it breaks internal scrolling and causes content clipping.
  - **WHY**: Prevents double scrollbars and ensures the header/footer remain pinned to the viewport edges.
- **Responsive Header Stacking**: Modal headers containing both a title and a search/control group MUST switch to `flex-direction: column` and `align-items: stretch` on mobile to prevent horizontal clipping.
- **Dynamic Viewport (dvh) Standard**: For full-screen containers (Modals, Combat Arena, Main View), use `dvh` units (e.g., `min-height: 100dvh`) instead of `vh`. This ensures the UI is resilient to browser UI bars (address bar, navigation) on iOS and Android.
  - **Audit Protection**: Usage of legacy `vw`/`vh` with numeric values is flagged as an error by `detect_viewport_units.py`.
- **Bottom Anchor Precision**: In mobile fullscreen, the action zone (Map/Arena) MUST be the flexible element (`flex: 1`) to push all UI controls to the absolute bottom edge (`0px` padding, `-2px` margin).
- **Emoji Scaling (Pixel Fonts)**: Never use `transform: Scale()` for emojis in buttons; use direct `font-size` (e.g., `32px`) and `inline-flex` with a relative offset (e.g., `top: -2px`) to center the emoji with the pixelated text baseline.
- **Loading Orchestration Gate (Sync Bypass)**: The global loading veil MUST be managed via `v-if` based on `LoadingStore.isGateOpen`.
  - **CRITICAL**: To prevent infinite loops on authentication routes, the gate MUST be forced OPEN síncronamente in `App.vue` if `window.location.pathname === '/login'`, bypassing the standard `onMounted` flow.
  - **WHY**: Ensures the user can always escape a corrupted session or "loading data" loop by manually navigating to login.

- **PWA Integrity (Desktop-First Hybrid)**:
  - **Display Mode**: ALWAYS use `display: standalone` in the manifest. Avoid `fullscreen` to prevent desktop browsers from hiding scrollbars or misidentifying the app as mobile-only.
  - **Breakpoint Parity (768px)**: JS window listeners and CSS media queries MUST share the exact same pixel value (Standard: **768px**) to avoid layout "dead zones".
  - **Forced HUD Visibility**: Use high-specificity CSS (e.g., `.main-hud-desktop`) with `min-width: 769px` to ensure HUD elements remain visible on PC screens even if PWA mode triggers mobile-first states.
  - **Navigation Fallback Synchronization**: The bottom navigation HUD (mobile-only) MUST only be visible when the top navigation is hidden.
    - **Desktop Rule**: On screens > 1410px, the bottom nav is HIDDEN unless `isHudHidden` is true (scroll-down).
    - **Implementation**: Sync using a `.hud-visible-active` class on the container that forces `display: flex !important`.
  - **Permission Persistence**: Persist PWA setup and notification permission states in `localStorage` to avoid re-triggering intrusive setup modals on every session.
  - **The "Deep Reset" Mandate (Resolution Sync)**: Transitions from Login/Title screens to the main game MUST be handled via physical reload (`window.location.href = '/'`) instead of SPA navigation (`router.push`).
    - **WHY**: Standalone PWA windows frequently glitch their internal viewport dimensions (`100dvh`) during internal navigation. A physical reload forces a hardware-level re-sync of the viewport and manifest state.
- **GSAP State Fail-safe**: Every global state change triggered by a visual transition (e.g., `open`, `close` in `ModalStore`) MUST include a `gsap.delayedCall` fallback (approx. 450-500ms) to ensure state integrity even if a component-level animation fails to report back.
  - **Reactive Scale Injection (Zoom)**: Any component responsible for the primary visual scale (e.g., `App.vue`) MUST use a `watch` on the user session state to re-apply the global zoom factor (`uiStore.setZoom`).
    - **WHY**: Ensures that if the browser resets its zoom factor during a session transition, the game engine explicitly re-asserts the correct pixel-perfect scale.
  - **Virtual Module Compatibility**: In Dev mode, if `virtual:pwa-register/vue` fails to resolve, use the base `virtual:pwa-register` and implement manual reactivity (using `ref`) for `needRefresh` and `offlineReady`.

### 2. Pixel Art Content (The "Game Heart")

- **MANDATORY**: All game-world elements **MUST** be Pixel Art (Sprites, Icons, Typography).
- **FORBIDDEN**: Modern high-res vector icons (SVG) or smooth fonts for primary game data.
- **EXCEPTION: Premium Branding**: High-res logos or emblems **SHOULD** use smooth rendering (`image-rendering: auto;`) to enhance the contrast.
- **GPU Persistence Rule**: To prevent "snapping" from smooth to pixelated after CSS transitions (especially on environmental backgrounds), use `image-rendering: auto` explicitly in `smooth` mixins and force GPU layer persistence with `will-change: filter, transform;` and `transform: TranslateZ(0);`.
- **Dynamic Variable Binding**: Context-dependent visual effects (glows, auras) MUST use dynamic CSS variables (e.g., `:style="{ '--type-color': color }"`) injected from the template to allow SCSS to remain generic.
- **Silhouette Integrity**: When rendering "Search Mode" or silhouetted Pokémon, use a solid black appearance (`filter: Brightness(0)`). To ensure visibility against dark battle backgrounds, ALWAYS apply a subtle white `drop-shadow(0 0 1px white)`.
- **Advanced SVG Silhouette (Subtraction Pattern)**: For pixel-perfect silhouettes with borders, use an SVG filter with a "Subtraction" algorithm:
  1. **Dilate** the SourceAlpha (e.g., 1.5px).
  2. **Subtract** the original SourceAlpha (`operator="out"`) to isolate the "ring".
  3. **Blur & Merge**: Blur only the ring and merge the original (black) body on top.
  - **WHY**: Prevents the border color from "bleeding" into the body and ensures a sharp, controllable outline even with blur.
- **Aesthetic Metadata Mandate**: Do not derive aesthetic traits (like "floating/flying height") purely from game types (e.g., Flying type). Use a centralized metadata registry (e.g., `POKEMON_AESTHETICS`) to explicitly flag species that should float (Magneton, Geodude) versus those that remain grounded (Charizard).
- **Environment Clipping (Bushes)**: In the combat arena, environmental assets (like grass/bushes) MUST be suppressed if the Pokémon is flagged as `isFloating`. This prevents visual clipping and reinforces the species' spatial identity.

---

## 🎨 Styling Standards

### 1. Premium HUD Containers

- **Premium Solidity**: Use high-contrast solid backgrounds with premium gradients for cards and overlays.
- **Borders**: Always use a sharp `1px solid rgba(255, 255, 255, 0.15)`.

### 2. Pixel-Perfect Typography (Sharpness Mandate)

- **Grid Alignment**: Pixel fonts (especially `Press Start 2P`) SHOULD use sizes that maintain aesthetic balance. While multiples of 8px are technically perfect, intermediate sizes (10px, 11px) are allowed for readability.
- **Anti-Alias Ban**: ALWAYS apply `@include pixelated;` to pixel fonts to force `-webkit-font-smoothing: none !important`.
- **Anti-Blur Technique (Aggressive)**: For pixel fonts at non-standard sizes (e.g., 11px), apply `transform: translateZ(0)` and `font-smooth: never !important` to force integer pixel rendering and prevent browser smoothing.
- **FORBIDDEN**:
  - Using `text-shadow` with any blur radius (must be 0px).
- **Centering**: Use **Flexbox/Grid** for centering. Avoid `transform: translate(-50%, -50%)` as it causes subpixel blurring in Chrome. Combine any unavoidable `Translatey/x` with `translateZ(0)` to maintain GPU layer stability during motion.
- **BST Aesthetics**: Game-world data (Stats, IVs, Levels) MUST prioritize these sharp pixelated tokens to reinforce the "Retro Heart".
- **Stat Color Standardization**:
  - **Level (NV)**: Purple (`#a855f7`).
  - **Stats/IVs**: Green (`#4ade80`).
  - **Total Power (BST)**: Yellow/Gold (`#fbbf24`).

### 3. Safari & GPU Performance (SSoT)

- **REQUIRED**: Prioritize the `opacity` property over `filter: opacity()` and use efficient shadow types based on element geometry.
- **SSoT Authority**: For exact hardware-acceleration rules, Safari-specific prefixes, and shadow density limits, refer to the **[SASS Styling Manual](../technical/sass_styling_manual.md)**.
- **Visual Goal**: Ensure smooth 60fps transitions on mobile devices by avoiding filter-heavy stacking in dense grids.
- **Filter Specificity Trap**: When applying global image filters (e.g., `img { filter: ... }`), always use `:not(.special-class)` to exclude specific states like `.silhouette`.
  - **WHY**: A general rule with high specificity (tag + class) can override specific class-only rules even if they use `!important`.
- **The Clipping Trap (Scale vs Overflow)**: NEVER use `Scale()` animations for ambient effects (pulsing) on elements contained by `overflow: hidden`. This causes visual clipping or makes content "flicker" as it exceeds the parent box. Use `Opacity()` or `Filter: Brightness()` for ambient "breathing" instead.

### 4. Interactive Pills & Badges

- **High-Density Layouts**: When horizontal space is limited (e.g., within Grid cards), use **Vertical Pills**.
- **HUD Pill Normalization**: All resource indicators in the HUD MUST follow the `money-pill` standard: dynamic font scaling (`fitText`), themed colors (e.g., Green for money, Purple for BC, Red for Balls), and glowing effects for premium visual feedback.
- **Icon Alignment & Scaling**: Img/SVG icons in HUD pills (like Poké Balls) MUST be normalized to a height of **20px** (vs. 16-18px for font icons) and use optical offsets (e.g., `margin-top: -2px`) to ensure the value text baseline is consistent across all pills.
- **Resource Breakdown Tooltips**: For pills that display an aggregated total (e.g., Poké Balls), the `PVTooltip` MUST provide a detailed breakdown (e.g., `• Poké Ball: 10 \n • Ultra Ball: 5`) to maintain data transparency without cluttering the main HUD.
- **Vertical Pill Standard**: Use `writing-mode: vertical-rl` and `text-orientation: upright` for the text, combined with a large icon (16-18px) positioned at the top.
- **Solidity**: Always apply solid backgrounds with high contrast borders (e.g., `rgba(79, 172, 254, 0.4)` for Fishing).
- **Abbreviated Labels (shortLabel)**: In compact UI (list buttons, small cards), use the `shortLabel` property from `tags.ts` to prevent text overflow. Maintain the full `label` in tooltips.
- **Badge Centralization**: All Pokémon status indicators (shiny, items, tags) MUST have their icon and label metadata centralized in `src/logic/constants/tags.ts`.
- **Standardized Type Tag Hierarchy**:
  - **ssm (5.5px)**: High-density layouts (Quick Team sidebar).
  - **sm (7px)**: Standard gameplay (Battle HUD, Moves grid).
  - **md (9px)**: Information headers (Detail modal).
  - **lg (11px)**: Hero/High-impact UI.
- **Visual Parity for ID Tags**: Tags representing static IDs (e.g., Pokedex #001) MUST follow the type pill aesthetic: White text with a perimetral black outline (`text-shadow`) to ensure legibility on any colored background.
- **Gender Badge Module**: ALWAYS use the `.m-badge-gender` standard class and symbols (♂/♀) for gender rendering. For compact displays (e.g., inside level badges), use a `.mini` modifier that utilizes `@include badge-gender(Npx)` to maintain design token consistency.
- **Pokemon Identity Stack**: Standardize name display on cards using the "Name Stack": The current nickname (or name) as the primary pixel title, with the species name as a small, uppercase, low-opacity subtitle.
- **Dynamic Abbreviation Toggle**: In responsive grids (like combat moves), use a dual-label system (`cat-full` and `cat-short`) controlled by CSS media queries.
  - **WHY**: Allows professional full text on desktop while automatically switching to optimized abbreviations (e.g., "Físico" ➡️ "FIS") on mobile without JS overhead.
- **Responsive Attack Grid & Unified Move Slots**:
  - **Single Component Mandate**: The move grid MUST be handled by a single modular component (e.g., `BattleMovesGrid.vue`) that handles both battle and information modes via context-aware props (`canReorder`, `playerInfo`).
  - **Symmetrical 2x2 Grid**: All move panels MUST maintain a fixed 2x2 layout with 4 slots always. Use `grid-auto-rows: 1fr` on the container to ensure that placeholders and move cards share the exact same height in every row.
  - **Informative Placeholders**: Empty slots MUST NOT be invisible. Use a muted "Placeholder" design with a tooltip explaining how to manage moves (e.g., "Puedes organizar movimientos desde la ficha de información").
  - **Unified Slot Architecture**: The move card and its info tab (`?`) MUST be wrapped in a single parent container (`move-slot-wrapper`) with unified borders and gradients. Hover effects and scaling MUST apply to this parent, ensuring the component moves as a single solid object.
  - **Precision Spacing**: When using absolute side-tabs, reduce internal card padding on the adjacent side (Standard: **4px**) to eliminate "dead space" between the icon and content.
  - **Threshold 1 (< 560px)**: Split stats (POT, PREC, CAT, PP) into a 2x2 grid.
  - **Threshold 2 (< 420px)**: Move the Type Tag to Row 1 (compacted). Card height MUST be normalized to ~64px to maintain density.
- **Combat Panel Standards (The "Always Small" Layout)**:
  - **Constraint**: Combat move cards MUST be limited to a maximum width of **200px** to ensure a 2-column grid fits in a 412px-420px mobile viewport.
  - **Grid Balancing**: Use asymmetric column widths (e.g., `grid-template-columns: 1.4fr 1fr`) to give more space to descriptive categories (POT/CAT) while keeping numeric stats (PREC/PP) aligned to the right.
  - **Font Scaling**: For move names, use **8px** pixel fonts. For type tags/categories, use **5px**.
  - **Layout Density**: In battle control grids, prioritize **zero padding** and **minimal gaps** (e.g., 4px) to maximize information density and prevent element clipping.
  - **Text Clipping Prevention**: Use `white-space: normal` and `word-break: break-word` for move names. For detail items (CAT, PP), use `white-space: nowrap` to ensure icons and labels remain on the same line.
  - **Category Display Logic**: In compact mode, show the full category label (e.g., "Físico") if screen width > 420px. Abbreviate to "FIS/ESP" only on viewports ≤ 420px.
  - **Button Alignment**: Action buttons (Bag/Switch) flanking a central Poké Ball (64px) MUST use a fixed `min-height` (Standard: **40px**) instead of `100%` height to maintain visual symmetry and prevent unintended stretching.
  - **Premium Battle Actions**: Buttons like "Cambiar" or "Mochila" MUST use the `btn-vicio('sm')` mixin. Manual GSAP or generic button classes are forbidden to preserve the project's 3D pixel-art identity.
  - **Move Button Solidity**: Combat moves MUST have solid dark backgrounds (`#12141c`) instead of high transparency. This ensures legibility of stats (PP, POT) while keeping type-colored borders for quick recognition.

- **Sidebar HUD Standards (Team & Bag Quick-Access)**:
  - **Aesthetic Parity**: Left (Team) and Right (Bag) sidebars MUST share identical visual traits: `Border-Radius(16px)`, solid high-contrast backgrounds, and `Border(1px solid Rgba(255, 255, 255, 0.15))`.
  - **Premium Contrast**: Use `Rgba(15, 23, 42, 1)` for a "Premium Solid" feel that ensures maximum readability against animated battle backgrounds.
  - **Performance Mode**: Sidebars MUST react to `is-performance-mode` by disabling `Box-Shadow` and complex transitions.
  - **Container Integrity**: Sidebar containers MUST be opaque to ensure data visibility.
  - **Oversized Item Sprites**: Use a scale of **1.5x** (Standard: `min-width: 60px`) for items in quick-access grids. Parent cards MUST have `overflow: hidden` to enable a premium "clipping" effect.
  - **Badge Alignment**: Numeric quantity badges in item grids MUST be centered horizontally and placed at the bottom edge (Standard: `bottom: 2px`, `left: 50%`, `TranslateX(-50%)`).
  - **Navigation Fallback Protocol**:
  - **Desktop (> 1410px)**: The bottom navigation HUD MUST be permanently hidden. It should NEVER appear during scroll or state transitions to avoid visual duplication and interface collision.
  - **Mobile (≤ 1410px)**: The bottom HUD is the primary navigation and MUST be **always visible**. Use `!important` flags for opacity and transform to ensure that global scroll logic does not hide it.
- **Neon Glow Intensity (High-Contrast Mandate)**: For tactical indicators (boosts/penalties) on the project's signature black backgrounds, glow effects (`box-shadow`) MUST use high intensity:
  - **Pure Colors**: Use pure RGB values (e.g., `#ff0000` for red, `#ffd700` for gold).
  - **Opacity & Radius**: Minimum `0.8` opacity for the outer glow and a spread radius of at least `20px` to ensure visibility against deep black.
- **Pixel Art Glow Balance**: For success sparkles and non-tactical VFX (e.g., capture stars), use subtle `text-shadow` (max 5px) and `filter: drop-shadow` (max 2px).
  - **WHY**: Preserves the sharp "Retro Heart" aesthetic without causing excessive blur or visual noise that obscures the pixel-art.
- **Tactical Border Hierarchy**: Tactical auras (Boosted/Penalized) MUST take priority over type-based color coding. Use inline styles or high-specificity computed styles to ensure the gold/red border overrides the default type border when a modifier is active.
- **Battle-Aware Modifiers**: All dynamic move modifiers (glows, "boosted" text, accuracy indicators) MUST verify `battleStore.isBattleActive` before applying environmental or time-based logic. This prevents combat-only states (like night-time accuracy boosts) from leaking into the team information screens outside of active battle.
- **Z-Index Layering**: HUD Navigation wrappers MUST use `pointer-events: none` and `z-index: var(--z-navigation)` to ensure they don't block interaction with Sidebar tools (Chat/Debug) while still allowing button clicks via `pointer-events: auto` on children.

### 5. Input Groups & Financial Layouts (Large Number Safety)

- **Input Stacking for Large Numbers**: Input groups housing numeric fields that can expand significantly (e.g., price inputs in the millions or billions) MUST be stacked vertically (`flex-direction: column`) rather than side-by-side in a narrow row. This allows the input box to stretch to 100% width of the form container, ensuring ample horizontal space for multi-million/billion figures.
- **Negative Value Formatting & Wrapping Prevention**: When formatting negative values, deductions, or transaction fees, avoid spaces between the minus sign and currency symbol (render as `-₱` instead of `- ₱`). Always apply `white-space: nowrap` on financial summary rows/spans to guarantee that the minus sign never wraps to a separate line in narrow layouts.

---

## 🎭 Animation & Motion Standards

### 1. Thematic Bobbing (Buoy Effect)

- **CONTEXT**: Use for maritime, fishing, or water-based UI elements.
- **Implementation**: Combine subtle `TranslateY` (4px offset) with a slight `Rotate` (1-2 degrees).
- **MANDATORY**: Use `TranslateY()` and `Rotate()` for SASS compliance (Note: the Vite plugin `vite-plugin-sass-traps.ts` handles this capitalization automatically, so writing standard lowercase properties is fully supported).
- **Cycle**: A slow 4-second `infinite ease-in-out` loop is recommended for an organic feel.
- **Pixel Art Sharpness**: NEVER use non-integer `Scale()` transformations on pixel art elements (sprites, icons) as it causes interpolation blur. Prefer subtle `TranslateY()` for hover feedback.
- **Night Cycle Lighting**: Atmospheric and weather effects must adapt to the night cycle.
  - **Brightness Capping**: Weather-driven brightness reductions MUST be capped during the night cycle. The base nighttime brightness factor (Standard: 0.6) acts as the absolute floor to prevent excessive darkening and maintain visibility.
  - **Audit**: Verify this via `AtmosphereLayer.vue` computed logic.
- **Cycle Sync in CSS**: The `AtmosphereLayer` MUST pass the current cycle (`night`, `day`, etc.) as a class to its children. This enables cycle-specific CSS overrides for weather overlays without JS overhead.

---

## 🖱️ Interaction & Modal Standards

### 1. The Interaction Stack (LIFO)

- **REQUIRED**: Interactions must behave as a strict **STACK** (Last-In-First-Out).
- **Hardware Acceleration**: Apply `transform: translateZ(0);` only when necessary for performance. **AVOID** it on text containers if it triggers interpolation blur.
- **Stacking Order**: The modal overlay MUST be a sibling **BEHIND** the content.
- **FORBIDDEN**: Applying `backdrop-filter` to a parent that contains the modal card, as it will blur the card content.
- **Dynamic Stacking Protocol (LIFO)**: Every modal MUST be registered in the global `activeModalStack` within `uiStore` to manage stacking depth.
  - **Implementation**: `BaseModal` must register its unique `instanceId` upon mounting/showing and calculate its `z-index` using `MODAL_BASE + (depth * MODAL_STEP)`.
  - **Closing Guard**: To prevent visual artifacts during transitions, the unregistration from the stack MUST be delayed (approx. 600ms) until the closing animation completes.
  - **Standalone Modals**: This protocol applies to BOTH stack-managed modals and standalone template-based modals to ensure "last-opened" always sits on top.

### 2. Interaction in Locked States

- **Mandatory Teleport**: Use `<Teleport to="body">` for global modals.
- **Overlay: None**: When no overlay is used, the main wrapper **MUST** have `pointer-events: none`.
- **Layout Parity Mandate**: When refactoring or restoring legacy UI, ensure HTML classes exactly match the SCSS selectors (e.g., `.list-item` vs `.poke-card`). Mismatches break the intended design.
- **Anchored UI Context**: Absolute elements (badges, floating icons) MUST be nested within a `position: relative` container (e.g., `.poke-preview-container`) to prevent layout drift.
- **Stacked Sprite Separation**: Avoid negative margins for overlapping sprites with opaque backgrounds. Use `gap` or explicit offsets in relative containers to ensure legibility.

### 3. Interactive Integrity

- **Pointer Events Safety**: NEVER use `pointer-events: none` on interactive icons, badges, or pills that are intended to be clickable. This blocks the event from reaching the element or its parent's handler.
- **Draggable Stability**: Apply `user-select: none` to draggable slots, cards, or grid items. This prevents text selection artifacts from disrupting the drag flow and ensures a stable "grab" feel.

### 4. Notifications & Toasts

- **MANDATORY**: Toasts must occupy the highest layer (`z-index: 999,999`).

### 5. Global Tooltip Architecture (PVTooltip)

All tooltips MUST use the `PVTooltip.vue` system. Native HTML `title` attributes are strictly FORBIDDEN.

- **Hybrid Engine**: Uses a "Flip-then-Nudge" algorithm. It first attempts to flip the position (e.g., from top to bottom) if there's no space, then "nudges" the coordinates to stay within a 10px safety margin of the viewport edges.
- **Anchor-Aware Arrows**: The tooltip arrow MUST remain aligned with the trigger element's center. When the box is nudged, use the `--arrow-x` and `--arrow-y` CSS variables to offset the arrow appropriately.
- **Visual Standard**: Tooltips must use `'Press Start 2P'` for titles, solid dark backgrounds for maximum contrast, and a **2px solid var(--yellow)** border for a "Vintage Premium" look.
- **Emoji Centering & Spacing**:
  - ALWAYS use `Translatey(-2px)` for optical centering of emojis when using pixelated fonts.
  - NEVER join multiple emojis with space characters (`join(' ')`) as the fixed-width pixel font space is disproportionately wide. Join them directly (`join('')`) and rely on CSS margins (`2px`).
- **Hemisphere Positioning**: Tooltips MUST detect screen hemispheres. Use `right` coordinates and `Translate(50%, ...)` for the right side to ensure expansion towards the center, preventing edge clipping and text compacting.
- **Symmetrical Transitions**: When using mirrored positioning (e.g., right-side expansion), transition transforms MUST be inverted simetrically to prevent horizontal sliding during entrance.
- **Structured Content**: Prefer `\n` (with `white-space: pre-wrap`) over horizontal separators (`|`) for atmospheric or complex data.
- **Scroll Behavior**: Tooltips MUST hide automatically as soon as the user initiates a `scroll`, `wheel`, or `touchmove` event. This prevents "floating" tooltips from losing their anchor during rapid navigation.

### 6. Data-Driven Tooltips (In-Game Manuals)

To ensure technical information is accurate and consistent:

- **Cumulative Tooltip Hierarchy**: La información en los tooltips de mapa (MapCard) debe ser aditiva y evitar contradicciones semánticas.
  - **REGLA**: El texto genérico `Habitante común` es un fallback absoluto. **NUNCA** debe mostrarse si el Pokémon tiene un modificador activo (Ciclo Horario o Clima).
  - **Jerarquía Ambiental**: El orden estándar para datos de atmósfera es **Ciclo -> Estación -> Clima**.
  - **Estructura**: `Aparición: [Horario] + [Modificador Clima]`.
  - **Ejemplo**: Si es un Pokémon de Noche potenciado por Lluvia, debe mostrar: `Aparición: 🌙 (Potenciado por: 🌧️)`.
  - **Visitantes**: Si es un visitante, el texto debe indicar explícitamente su origen climático para justificar su presencia fuera de su hábitat natural.
- **Case-Insensitive Lookup**: Every query to `ABILITY_DATA` or `NATURE_DATA` MUST normalize keys (`.toLowerCase()`). This prevents visual failures if the Pokémon database uses "OSADO" and the manual uses "Osado".

- **Full Descriptions**: Avoid placeholders. Tooltips MUST display the `.desc` field of the data object. If it doesn't exist, use an informative fallback like "Special ability of this Pokémon."
- **Contextual Iconography**: Use distinctive icons (e.g., 🧠 for Nature, 🧬 for Ability) in interactive labels to indicate that the element is clickable/hoverable.

### 7. Modal Variants & Aesthetics

The `BaseModal.vue` component supports parameterized aesthetics to maintain consistency:

- **variant="modern" (Default)**: Sleek, solid-first design, subtle borders.
- **variant="retro"**: High-contrast 2px yellow border (`var(--yellow)`), 30px corner radius, and **20px** default internal padding. Use for gameplay, shops, and settings.
- **hide-header**: Use to remove the header bar for content-focused modals. The close button (`X`) will automatically transition to a floating position (`modal-close-btn-floating`).
- **Close Button Hierarchy**: The close button MUST be the LAST element in the modal's DOM structure. This guarantees it sits above all slotted content regardless of internal component complexity.
- **padding="raw"**: Use for full-bleed content (e.g., Shop/Inventory grids). The `retro` variant respects this to avoid double-padding.
- **BaseModal Inheritance (X Logic)**: Respect `BaseModal`'s responsibility for rendering the close button. If `hide-header` is used, the button automatically transitions to a floating position. Never manually include an "X" or close button in custom header slots, as this leads to UI duplication.
- **Modal Header Stats Cleanliness**: Numeric metrics displayed in modal headers (such as currency credits, trainer levels, limits, or active counts) MUST NOT use custom container frames, dark backgrounds, distinct padding, or surrounding box-shadows. They should be rendered as clean, transparent-background text labels directly on the modal header background. The values must use a standard large pixel font size (`16px`, `font-weight: 900`), applying standard green (`var(--green)`) for currency and standard gold (`var(--yellow)`) for limits, counts, or trainer levels to align with Poké Market, BC Shop, and GTS consistency.

### 8. Premium 3D Action Buttons

Standardized via the `@mixin btn-vicio-primary` and `.btn-vicio-primary` class:

- **Aesthetic**: Solid 3D depth using `box-shadow: 0 4px 0 #b45309` (not fuzzy/rgba shadows).
- **Interaction**:
  - **Hover**: 1px upward translation (`TranslateY(-1px)`) and subtle brightness boost.
  - **Active**: 2px downward translation (`TranslateY(2px)`) with shadow reduction to 2px, simulating a physical press.
- **Typography**: Must use `'Press Start 2P'` with `@include pixelated`.
- **Constraint**: Primary action buttons (yellow) MUST follow this pattern to maintain visual parity.
- **Active State Unification**: Selected/Active buttons (`.active`) MUST preserve their 3D shadow depth. Use a 2px white solid border and a selection glow (`box-shadow`), but keep the dark bottom shadow to avoid a "flat" or "broken" look.
- **Atmospheric Clarity**: To ensure focus on playable areas, certain atmospheric effects are hidden based on game state. see [game_mechanics_manual.md](../core/game_mechanics_manual.md) for visibility rules.
- **Cursor Consistency Mandate**: All interactive elements (badges, items, pills) that provide information via tooltips MUST use `cursor: pointer`. Avoid `cursor: help` (the question mark) to maintain a premium, responsive feel across the entire UI.
- **Action Grouping (Box/Inventory)**: High-level management actions (e.g., Mercado Negro, Liberar) MUST be grouped in the primary navigation/header bar (slots like `#extra` in `BoxTabs`) to maximize the area dedicated to content grids.
- **Global Event Listeners**: Window/Global event listeners (e.g., `online`, `click` retry) used outside component lifecycles (like in Pinia stores) MUST be marked with `// [PureVue-Ignore]` to satisfy audit standards while maintaining necessary logic.

### 9. Data Flow and Testability

- **Prop-Drilling vs. Store-Access**: Information components (like `BattleInfoCard` or `PokemonStatusSection`) MUST rely on their `props` (`pokemon`) to process statuses and descriptions.
- **FORBIDDEN**: Avoid direct access to the global `battleStore` within stat display logic if the component can be used in other contexts (Box, Bag, Tests). This ensures the component is individually testable without requiring an active battle state.

### 10. Admin Tool Modal Standards

...

### 11. Admin Debug Overlays (Combat & Management)

To facilitate real-time mechanical verification without cluttering the production UI:

- **Visibility Constraint**: Debug overlays MUST be wrapped in an `isAdmin` check (via `useProfileStore`).
- **Interaction Pattern**: Use `hover` states to reveal detailed technical data (e.g., base stats, stage multipliers, internal IDs).
- **Visual Distinction**: Admin-only tooltips should be titled with an emoji like 😈 or 🛠️ to clearly distinguish them from standard game feedback.
- **Color Coding**: Use standard project colors (`$green` for buffs, `$red` for debuffs) within these panels to ensure data is scannable at a glance.
- **Reactive Engine Sync**: Debug/Admin controls (Shiny, Guardian, Camera guides) MUST be directly bound to the global `BattleStore` state. Toggling these buttons MUST reflect the engine's internal configuration in real-time to avoid "UI-Ghosting" where a button looks active but the feature is disabled.

For complex developer tools or admin panels with high-density forms:

- **Minimum Width**: Use `max-width: 500px` to accommodate multi-column inputs and sub-grids (Stats/IVs) without text clipping.
- **Responsive Stacking**: Use `repeat(auto-fit, minmax(210px, 1fr))` for main layout grids. This ensures content stacks vertically in narrow viewports, maintaining horizontal fit.
- **Space Efficiency**: Reduce internal `gap` and `padding` to `6px-8px` in dense grids to maximize usable horizontal space.

### 12. Combat Agency and Control

- **Manual Defeat**: It is strictly forbidden to automatically close the battle modal after a defeat. The results screen MUST be shown, and the user MUST be allowed to exit manually ("Go to Map") to maintain agency over the final logs.
- **Independent HUD**: Health bar visibility MUST be linked to the individual combatant's state, not the global battle phase. Hiding both HUDs when only one is in transition (e.g., enemy capture) causes visual disorientation.

### 13. Modal Stack & Performance Synchronization

To ensure a seamless transition between full-map exploration and focused modal interactions:

- **Triggering Condition**: Only modals that obscure the background (those with overlays or full-screen) should trigger the "Simplified Map" mode.
- **Entrance Timing**: Activate simplification **AFTER** the entrance animation of the first obscuring modal is complete. This avoids a visual "pop" during the fade-in.
- **Exit Timing**: Restore the full-fidelity map **AS SOON AS** the closing animation of the last obscuring modal begins. This provides a premium feel by letting the user see the world return while the overlay disappears.
- **GPU-First Simplification**: When a new modal is opened above others, the modals below MUST be simplified (`isSimplified = true`) IMMEDIATELY at the start of the transition (not after it ends). This maximizes GPU bandwidth for the opening animation and prevents dropped frames during high-fidelity transitions.

- **Battle Modal Jitter**: Combat arenas, control panels, and individual sprite containers MUST use `overflow: hidden !important` (or `overflow: clip`) to prevent unintended scrollbars during scaling, rotation, or VFX.
- **Marketplace & Shop Standards**: To ensure a premium feel and prevent text truncation in dense item grids:
  - **Symmetrical Grid Padding**: Shop grids (e.g., `.shop-grid-wrapper`) MUST use symmetric padding (Standard: **20px**) to ensure the scrollbar is flush with the modal border and the content feels balanced.
  - **Multi-line Text Truncation**: Descriptions MUST never be cut off abruptly. Use `-webkit-line-clamp: 4` to allow up to 4 lines of text before showing an ellipsis. Ensure `min-height` is sufficient to prevent layout shifts.
  - **Item Name Wrapping**: Item names MUST allow wrapping (max 2 lines) instead of using `white-space: nowrap`. This prevents names from being cut off or showing ellipsis prematurely in narrow cards.
  - **BC Shop Branding**: Exclusive items in the Battle Club shop MUST use purple currency iconography with premium `drop-shadow` effects (e.g., `#c084fc` glow) to distinguish them from standard Poké Market items.
  - **Action Alignment**: Primary action buttons in shop/market cards (e.g., "COMPRAR") MUST be aligned to the right (`justify-content: flex-end`) to maintain UX consistency.
- **Interactive Tooltip Bubbling**: Tooltips attached to interactive elements (buttons, pills) MUST allow event bubbling. NEVER use `.stop` on a tooltip's click handler if it blocks the parent's interaction.
- **Mobile Fullscreen Stability**: In `type-fullscreen` modals, use ultra-specific selectors and `contain: content` to ensure the layout remains static and jitter-free during internal animations.

### 14. Mobile & Responsive Refinement

- **Responsive Control Stacking**: In mobile layouts, prioritize `flex-direction: column` and `flex: none` for stacked control groups (like Sort/Search bars) to prevent unintended vertical stretching.
- **HUD Information Scaling (Combat)**: On small screens (≤ 600px), information panes should reduce their internal scale (padding, font-size, min-width) to avoid blocking the combatants and environmental sprites.
- **Edge-Anchored Positioning**: Use a combination of `cqw` and media queries to pull HUD elements towards the edges of the viewport on mobile. This ensures the central "action zone" remains as clear as possible.
- **Stable Positioning in Dynamic Containers**: Avoid using percentage-based vertical centering (`top: 50%`) for absolute elements within containers that might grow vertically. Use fixed pixel offsets to maintain icon alignment.
- **Data Grid Accessibility**: Complex data tables/grids MUST be wrapped in a `.table-responsive-wrapper` with `overflow-x: auto` on mobile to prevent column clipping.
- **Fullscreen Modal Continuity**: The primary content container (e.g., `.upd-core-container`) MUST use `min-height: 100%` in fullscreen mode to ensure the background color remains consistent across the entire viewport.
- **Standardized Content Body**: Always use the `.upd-core-body` class for modal tab contents to inherit project-standard padding, scrolling, and background styles.

### 15. Sticky Interface Refs

To prevent visual "jitter" or layout shifts during state transitions, use **Sticky Refs** (local memory variables) that hold the last valid value while the underlying store is updating or clearing.

- **Combat Anchors**: Keep ground-coordinates in a local `ref` that only updates when new *confirmed* data arrives.
- **HUD Stability**: A Pokémon's info-card MUST stay visible during finishing animations (`isFinishing`) until the Pokémon physically leaves the screen or the HP reaches zero.

### 16. Persistent Player HUD

The player's HUD (health and status) SHOULD remain visible during the search/exploration phase.

- **Why**: Prevents redundant "entry" animations when a battle starts, as the HUD is already present. It also allows the player to monitor their health between encounters without entering a menu.

### 17. Asset Parity & Positional Inheritance

To guarantee a seamless "Live" feel during multi-phase transitions (e.g., from Search Preview to Battle), components MUST implement positional inheritance.

- **Rule**: If two sequential objects share the same ID (e.g., the previewed Pokémon and the actual battle enemy), the secondary object MUST inherit the calculated metadata (like `feetY` ground position) from the primary object.
- **Why**: Eliminates 1-frame position jumps ("teleports") and avoids redundant asynchronous calculations that degrade the user experience.
- **Stable Grounding**: Ground shadows and environmental effects (like grass) MUST be placed in a non-animated container (or a sibling of the animated one). This ensures that even if the sprite bounces or jump-attacks, its shadow remains physically anchored to the floor coordinates.
- **Bottom-Anchor Grounding**: For entity positioning in the virtual world, always prioritize `bottom`-relative coordinates over `top` percentages. This ensures that sprites with different amounts of empty space in their PNG source remain perfectly anchored to the ground line.
- **Continuity via UID**: When transitioning between encounter phases (e.g., Search Preview to Battle), components MUST use the instance `uid` as the `:key`.
  - **WHY**: Ensures Vue reuses the exact same DOM node instead of re-mounting, preventing flickering and maintaining visual state (like animation frames) across phase boundaries.

### 18. Atmospheric & Environmental Framing

To unify the environmental immersion across the Map and Battle Arena:

- **Static Perimetric Framing**: Atmospheric conditions (Fog, Mist, Snow, Blizzard, Sandstorm, Heatwave) MUST use a pseudo-element `::after` on the main overlay container for framing.
- **Decoupled Opacity**: The framing logic (shadows/gradients) MUST be independent of internal particle layers. This ensures the perimeter remains static even if the weather particles (mist/snow) pulse or fade.
- **Danger Signature (Heat/Sand)**: Climates that cause recurring damage (Heatwave, Sandstorm) MUST use a pulsing red frame (`anim-glow`) and a red-tinted radial gradient to signal environmental danger.
- **Solid White Standard (Cold/Fog)**: Cold weather types (Fog, Mist, Snow, Blizzard) MUST use a high-opacity (**0.75**) white `box-shadow` to create a solid, frosty encasement that maintains visibility over dense backgrounds.
- **Center Transparency Mandate**: Every atmospheric frame MUST maintain a clear central action zone. The `Radial-Gradient` MUST start being transparent at **50%** of the container to prevent "washing out" the main art while keeping a strong perimeter.
- **Normalization Strategy**: Use static `::after` elements for the perimeter frame. This decouples the atmospheric "fog/tint" from active particle layers, ensuring visual stability and preventing "ghosting" or UI-flicker during weather transitions.
- **Danger Signature (Heat/Sand)**: Climates that cause recurring damage (Heatwave, Sandstorm) MUST use a pulsing red frame (`anim-glow`) and a red-tinted radial gradient to signal environmental danger.
- **Solid White Standard (Cold/Fog)**: Cold weather types (Fog, Mist, Snow, Blizzard) MUST use a high-opacity (**0.75**) white `box-shadow` to create a solid, frosty encasement that maintains visibility over dense backgrounds.

---

## 🗺️ Virtual World & Entity Alignment

To maintain pixel-perfect alignment in the high-fidelity 2D combat arena:

### 1. Entity Occupancy Logic

- **Standard**: All combatants are allocated a square bounding box defined by `ENTITY_SIZE`.
- **Scaling**: All internal entity assets (shadows, bushes, sprites) MUST be expressed as percentages relative to this `ENTITY_SIZE` container.
- **Center Alignment**: Sprites MUST be centered horizontally and vertically within this square (`object-position: center`) to maintain a common focal point.

### 2. Shadow & Ground Synchronization (Pixelated Standard)

- **Rendered Parity**: Shadow positions MUST be calculated based on the *rendered* height of the sprite (`object-fit: contain`) inside the entity square.
- **Formula**: The vertical offset is derived from the ratio between the sprite's `feetY` (ground level) and the total `ENTITY_SIZE`.
- **Pixelation Technique**: Generate shadows on a low-resolution canvas (e.g., 10x7), disable anti-aliasing (`imageSmoothingEnabled = false`), and scale up via CSS with `image-rendering: pixelated`.
- **Centralization**: All shadow dimensions and base offsets MUST be controlled by `spatialCoordinator.ts`. Prohibit hardcoded dimensions in CSS (scoped or global) to avoid layout collisions.
- **WHY**: Ensures the shadow sits exactly at the feet even if the sprite is wide or centered, maintaining a consistent "Retro Heart" aesthetic even during camera zooms.

### 3. Depth Sorting (3D Perspective in 2D)

- **Encounter Layers**: To simulate depth, use distinct vertical offsets for environmental layers relative to the feet line:
  - **Back Layers**: Positions assets slightly above (behind) the feet contact point.
  - **Front Layers**: Positions assets slightly below (in front of) the feet contact point.
- **WHY**: Creates a "sandwich" effect where the Pokémon is truly embedded in the environment.

### 4. Camera Scaling & Asymmetrical Framing

To maximize action zone visibility while protecting the UI in high-density combat views:

- **Dual-Axis Constraints**: Use independent `VISIBLE_UNITS` for X and Y axes. Calculate scale as the minimum ratio between the camera frame and the target units.
- **Asymmetrical Margins**: Shift the focal point (`TARGET_Y`) away from the center to create uneven padding.
  - **Standard**: Pin the bottom boundary with minimal padding to maximize action menu space.
  - **Standard**: Maintain a safety margin at the top to clear atmospheric overlays or HUD icons.
- **WHY**: Ensures Pokémon remain as large as possible across all device ratios without being obscured by permanent HUD elements.

---

## 📏 Layering & Z-Index Governance

To prevent "z-index wars" and ensure consistent interaction, all layers MUST follow the centralized scale defined in `_variables.scss`.

### 1. Standard Layers (0-999)

- **Base**: 0 (Map Background).
- **HUD**: 100-200.
- **Standard Modals**: 300-500.
- **Overlays/Blocking Modals**: 600-800.
- **Global UI (Header/Menu)**: 900.

### 2. Critical Layers (999,999)

- **MANDATORY**: Only Tooltips, Toasts, and Emergency Overlays (like Error/Ban screens) are allowed to exceed the 999 threshold.
- **Pattern**: Use `z-index: var(--z-critical)` (999,999) via `<Teleport to="body">`.
- **Admin Panel Exception**: Tooltips spawned inside admin panels MUST use this critical layer to remain visible above the panel's high stacking context.
- **Stacking Context Isolation**: Use `isolation: isolate;` on complex UI cards (like MapCards). This allows the use of negative `z-index` values for background/atmosphere layers that remain contained within the component, preventing them from bleeding behind the main layout.
- **Standard Map Layers**:
  - Background: `z-index: -3`
  - Weather: `z-index: -2`
  - Atmosphere/Filters: `z-index: -1`
  - Interactive Content: `z-index: var(--z-map-spawns)` (10)
  - UI Layer (Header, Pills, Guardian): `z-index: var(--z-map-ui)` (20)
- **Immutable Hierarchy (Source of Truth)**: To prevent visual regressions, all map layering MUST use constants defined in `src/logic/constants/visuals.ts`. This ensures a permanent segregation: `Fondo (0) < Clima (8) < Oscuridad Hover (9) < Pokémon (10) < UI (20)`.

### 3. Layering Delta Standard (+10)

To ensure consistent interaction feedback, the UI/Control layer of an interactive component MUST always be positioned at least **+10 levels** above the primary content/entity layer (e.g., entity spawns).

### 4. Audit-Safe Z-Index

Hardcoded numeric values for `z-index` (e.g., `10`, `20`) are strictly FORBIDDEN in SCSS. Always use standardized CSS variables (e.g., `var(--z-map-spawns)`) defined in `src/logic/constants/visuals.ts`.

- **Visibility Guard**: If an entire view appears "dark and disabled", verify that the `LoadingGate` (z-index: `MAX`) or a blocking modal hasn't been left open due to an unhandled JS error in the mounting lifecycle.

---

## 🛠️ Aesthetic Audit Checklist

For a full verification, consult the centralized **[Aesthetic Audit Checklist](../qa/audit_checklist.md)**.

1. `[ ]` **Hybrid Check**: Are modern frames combined with pixel-art content?
2. `[ ]` **Typography**: Is `@include pixelated;` used for all pixel fonts?
3. `[ ]` **Performance**: Are GPU promotions (`will-change`) properly applied?
4. `[ ]` **Stacking**: Does the modal behavior follow LIFO rules?

### 18. Battle Log Accuracy & Attribution

The combat log is the primary source of truth for the user. It MUST maintain absolute precision in Pokémon attribution.

- **Faint Attribution**: Log messages for fainted Pokémon MUST strictly use the identity of the current defender.
  - **Incorrect**: `¡${e.name} enemigo se debilitó!` (Hardcoded 'enemigo' while checking player HP).
  - **Correct**: `¡${p.name} se debilitó!` or `¡${e.name} salvaje fue derrotado!`.
- **Action Logs**: Use standardized CSS classes (`log-info`, `log-player`, `log-enemy`, `log-danger`) to color-code entries.
- **Log Visibility Mandate**: Side indicators (red/green) MUST have a minimum opacity of `0.15` and a `border-left` intensity of `0.4` to ensure they are distinguishable on dark premium backgrounds.
- **HUD Weather Parity**: Every active weather condition MUST display a dedicated icon in the `BattleInfoCard` status container.
  - **Sun (☀️)**: Red tint, Fire boost.
  - **Rain (🌧️)**: Blue tint, Water boost.
  - **Sandstorm (🏜️)**: Rock SpD boost, residual damage.
  - **Snow (❄️)**: Ice Def boost (Gen 9), no damage.
  - **Fog (🌫️)**: Accuracy penalty (60%).
  - **MANDATORY**: Each icon MUST include a `PVTooltip` explaining the exact mechanical benefits or penalties for the current Pokémon.

### 19. Selection Modal Heuristics

To ensure a frictionless management experience, selection modals (`PokemonSelectionModal`) must adapt their information density based on the inferred context:

- **HP Visibility**: Automatically show the HP bar and numeric status if `allowedIds` is present (implying item application) or if opened in a battle context.
- **Inline Layout**: The HP status (label, bar, and text) MUST occupy a single horizontal row to maintain compactness and professional alignment.

### 20. Debug Visibility Standards

To clearly separate development feedback from game narrative:

- **Debug Iconography**: Any log message generated for debugging (starting with `DEBUG:`) MUST use the 😈 emoji as its primary icon.
- **Emoji Rendering**: Emojis in logs must be rendered as text spans with `font-size: 24px` and a subtle shadow, ensuring they stand out without requiring external image assets.

### 21. DevTools Visual Feedback

Debug buttons and tools MUST provide real-time visual feedback:

- **Active State**: Buttons for effects or states (Weather, Screens) must change appearance (e.g., color tint or glow) if the state is currently active in the store.
- **Reactive Sync**: Debug UI must use Pinia stores to ensure the interface reflects changes made via CLI or other components instantly.

### 22. Administrative Debug HUDs

To facilitate real-time mechanical verification without disrupting the "Pixel Heart" immersion:

- **HUD Centralization**: Technical data (base stats, multipliers, internal IDs) MUST be centralized in the HUD (e.g., `BattleInfoCard`) and NOT attached to the game entities (Pokémon sprites). This prevents layout shifts and "shrinking" issues during coordinate scans.
- **Dedicated Trigger (❓)**: Administrative tooltips MUST be anchored to a dedicated trigger icon (standard: ❓ emoji in a circular pulse frame) in the top-right of the HUD. This avoids mouse-event conflicts with standard game tooltips.
- **Explicit Labeling**: Every administrative panel MUST include the disclaimer "⚠️ Solo visible para ADMIN" at the bottom to maintain transparency during development reviews.
- **Environment Detection**: Use `db.isLocal` (or the injected `DBRouter` instance) to automatically enable these tools in local/offline login instances without requiring manual role configuration.
- **Admin HUD Persistence**: Debug panels MUST persist across combat turns, allowing continuous observation of stat modifiers (Stages) without manual reactivation.

### 23. Dynamic Weather Visibility in the HUD

To prevent overloading the HUD with irrelevant information, weather and time cycle advantages or penalties MUST only be shown if they directly affect the active Pokémon's types or moves.

- **Evaluation**: The HUD must check if the active Pokémon shares a type with the active weather or time cycle effects, or if any of its available moves are influenced by them.
