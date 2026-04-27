# UI/UX & Aesthetic Standards

This manual defines the visual identity and interaction patterns of the Poké Vicio project, ensuring a premium **Hybrid Retro-Modern** experience.

---

## ✨ The Hybrid Retro-Modern Mandate

We prioritize a deliberate contrast between modern, sleek UI shells and classic, pixel-perfect content.

### 1. Modern UI Shell (Containers & Layouts)

- **REQUIRED**: Use state-of-the-art UI techniques for layouts, cards, and backgrounds.
- **Techniques**: Glassmorphism (`-webkit-backdrop-filter: Blur(); backdrop-filter: Blur();`), HSL gradients, smooth shadows, and fluid transitions.
- **Goal**: The "frame" must feel premium, modern, and reactive.
- **Dynamic Layout Balance**: Use `flex-wrap: wrap` with flexible bases (e.g., `flex: 1 1 650px`) to create organic responsive transitions that adapt to intermediate viewports (like 1360px) without rigid breakpoints.

### 2. Pixel Art Content (The "Game Heart")

- **MANDATORY**: All game-world elements **MUST** be Pixel Art (Sprites, Icons, Typography).
- **FORBIDDEN**: Modern high-res vector icons (SVG) or smooth fonts for primary game data.
- **EXCEPTION: Premium Branding**: High-res logos or emblems **SHOULD** use smooth rendering (`image-rendering: auto;`) to enhance the contrast.
- **GPU Persistence Rule**: To prevent "snapping" from smooth to pixelated after CSS transitions (especially on environmental backgrounds), use `image-rendering: auto` explicitly in `smooth` mixins and force GPU layer persistence with `will-change: filter, transform;` and `transform: TranslateZ(0);`.
- **Dynamic Variable Binding**: Context-dependent visual effects (glows, auras) MUST use dynamic CSS variables (e.g., `:style="{ '--type-color': color }"`) injected from the template to allow SCSS to remain generic.

---

## 🎨 Styling Standards

### 1. Premium HUD Glassmorphism

- **HUD Headers/Main Bars**: Use `@include glass-solid(linear-gradient(180deg, #161a2e 0%, #0a0c14 100%))`.
- **Borders**: Always use a subtle `1px solid rgba(255, 255, 255, 0.15)`.

### 2. Pixel-Perfect Typography (Sharpness Mandate)

- **Grid Alignment**: Pixel fonts (especially `Press Start 2P`) SHOULD use sizes that maintain aesthetic balance. While multiples of 8px are technically perfect, intermediate sizes (10px, 11px) are allowed for readability.
- **Anti-Alias Ban**: ALWAYS apply `@include pixelated;` to pixel fonts to force `-webkit-font-smoothing: none !important`.
- **FORBIDDEN**:
  - Using `text-shadow` with any blur radius (must be 0px).
- **Centering**: Use **Flexbox/Grid** for centering. Avoid `transform: translate(-50%, -50%)` as it causes subpixel blurring in Chrome.
- **BST Aesthetics**: Game-world data (Stats, IVs, Levels) MUST prioritize these sharp pixelated tokens to reinforce the "Retro Heart".
- **Stat Color Standardization**:
  - **Level (NV)**: Purple (`#a855f7`).
  - **Stats/IVs**: Green (`#4ade80`).
  - **Total Power (BST)**: Yellow/Gold (`#fbbf24`).

### 3. Safari Compatibility (Prefix Mandate)

- **REQUIRED**: Always precede `backdrop-filter` with `-webkit-backdrop-filter`.
- **Standard Parity**: Pair vendor prefixes with standard properties (e.g., `-webkit-line-clamp` + `line-clamp`).

### 4. Interactive Pills & Badges

- **High-Density Layouts**: When horizontal space is limited (e.g., within Grid cards), use **Vertical Pills**.
- **Vertical Pill Standard**: Use `writing-mode: vertical-rl` and `text-orientation: upright` for the text, combined with a large icon (16-18px) positioned at the top.
- **Glassmorphism**: Always apply `@include glass-solid` with a thin themed border (`rgba(79, 172, 254, 0.4)` for Fishing).
- **Abbreviated Labels (shortLabel)**: In compact UI (list buttons, small cards), use the `shortLabel` property from `tags.js` to prevent text overflow. Maintain the full `label` in tooltips.
- **Badge Centralization**: All Pokémon status indicators (shiny, items, tags) MUST have their icon and label metadata centralized in `src/logic/constants/tags.js`.

---

## 🎭 Animation & Motion Standards

### 1. Thematic Bobbing (Buoy Effect)

- **CONTEXT**: Use for maritime, fishing, or water-based UI elements.
- **Implementation**: Combine subtle `TranslateY` (4px offset) with a slight `Rotate` (1-2 degrees).
- **MANDATORY**: Use **Capitalized** `TranslateY()` and `Rotate()` for SASS compliance.
- **Cycle**: A slow 4-second `infinite ease-in-out` loop is recommended for an organic feel.
- **Pixel Art Sharpness**: NEVER use non-integer `Scale()` transformations on pixel art elements (sprites, icons) as it causes interpolation blur. Prefer subtle `TranslateY()` for hover feedback.
- **Night Cycle Lighting**: Atmospheric and weather effects must adapt to the night cycle. For the specific logic rules (illumination overrides, tints), see [game_rules_manual.md](./game_rules_manual.md).

---

## 🖱️ Interaction & Modal Standards

### 1. The Interaction Stack (LIFO)

- **REQUIRED**: Interactions must behave as a strict **STACK** (Last-In-First-Out).
- **Hardware Acceleration**: Apply `transform: translateZ(0);` only when necessary for performance. **AVOID** it on text containers if it triggers interpolation blur.
- **Stacking Order**: The modal overlay MUST be a sibling **BEHIND** the content.
- **FORBIDDEN**: Applying `backdrop-filter` to a parent that contains the modal card, as it will blur the card content.

### 2. Interaction in Locked States

- **Mandatory Teleport**: Use `<Teleport to="body">` for global modals.
- **Overlay: None**: When no overlay is used, the main wrapper **MUST** have `pointer-events: none`.
- **Layout Parity Mandate**: When refactoring or restoring legacy UI, ensure HTML classes exactly match the SCSS selectors (e.g., `.list-item` vs `.poke-card`). Mismatches break the intended design.
- **Anchored UI Context**: Absolute elements (badges, floating icons) MUST be nested within a `position: relative` container (e.g., `.poke-preview-container`) to prevent layout drift.
- **Stacked Sprite Separation**: Avoid negative margins for overlapping sprites with opaque backgrounds. Use `gap` or explicit offsets in relative containers to ensure legibility.

### 3. Notifications & Toasts

- **MANDATORY**: Toasts must occupy the highest layer (`z-index: 999,999`).

### 4. Global Tooltip Architecture (PVTooltip)

All tooltips MUST use the `PVTooltip.vue` system. Native HTML `title` attributes are strictly FORBIDDEN.

- **Hybrid Engine**: Uses a "Flip-then-Nudge" algorithm. It first attempts to flip the position (e.g., from top to bottom) if there's no space, then "nudges" the coordinates to stay within a 10px safety margin of the viewport edges.
- **Anchor-Aware Arrows**: The tooltip arrow MUST remain aligned with the trigger element's center. When the box is nudged, use the `--arrow-x` and `--arrow-y` CSS variables to offset the arrow appropriately.
- **Visual Standard**: Tooltips must use `'Press Start 2P'` for titles, glassmorphism (`Blur(10px)`), and a `$yellow` border.

### 5. Modal Variants & Aesthetics

The `BaseModal.vue` component supports parameterized aesthetics to maintain consistency:

- **variant="modern" (Default)**: Sleek, glassmorphism-focused, subtle borders.
- **variant="retro"**: High-contrast 2px yellow border (`var(--yellow)`), 30px corner radius, and **20px** default internal padding. Use for gameplay, shops, and settings.
- **hide-header**: Use to remove the header bar for content-focused modals. The close button (`X`) will automatically transition to a floating position (`modal-close-btn-floating`).
- **Close Button Hierarchy**: The close button MUST be the LAST element in the modal's DOM structure. This guarantees it sits above all slotted content regardless of internal component complexity.
- **padding="raw"**: Use for full-bleed content (e.g., Shop/Inventory grids). The `retro` variant respects this to avoid double-padding.

### 7. Admin Tool Modal Standards

For complex developer tools or admin panels with high-density forms:

- **Minimum Width**: Use `max-width: 500px` to accommodate multi-column inputs and sub-grids (Stats/IVs) without text clipping.
- **Responsive Stacking**: Use `repeat(auto-fit, minmax(210px, 1fr))` for main layout grids. This ensures content stacks vertically in narrow viewports, maintaining horizontal fit.
- **Space Efficiency**: Reduce internal `gap` and `padding` to `6px-8px` in dense grids to maximize usable horizontal space.

### 6. Premium 3D Action Buttons

Standardized via the `@mixin btn-vicio-primary` and `.btn-vicio-primary` class:

- **Aesthetic**: Solid 3D depth using `box-shadow: 0 4px 0 #b45309` (not fuzzy/rgba shadows).
- **Interaction**:
  - **Hover**: 1px upward translation (`TranslateY(-1px)`) and subtle brightness boost.
  - **Active**: 2px downward translation (`TranslateY(2px)`) with shadow reduction to 2px, simulating a physical press.
- **Typography**: Must use `'Press Start 2P'` with `@include pixelated`.
- **Constraint**: Primary action buttons (yellow) MUST follow this pattern to maintain visual parity.
- **Active State Unification**: Selected/Active buttons (`.active`) MUST preserve their 3D shadow depth. Use a 2px white solid border and a selection glow (`box-shadow`), but keep the dark bottom shadow to avoid a "flat" or "broken" look.
- **Atmospheric Clarity**: To ensure focus on playable areas, certain atmospheric effects are hidden based on game state. See [game_rules_manual.md](./game_rules_manual.md) for visibility rules.

> [!IMPORTANT]
> **Close Button Rule**: The "X" button MUST always be visible and correctly positioned in the top-right corner, regardless of variant or header visibility.

---

## 📖 Content Readability

- **Max-Width**: Articles must have a max-width of `1000px`.
- **Padding**: Use `32px` internal padding for main article content.

### 7. Modal Stack & Performance Synchronization

To ensure a seamless transition between full-map exploration and focused modal interactions:

- **Triggering Condition**: Only modals that obscure the background (those with overlays or full-screen) should trigger the "Simplified Map" mode.
- **Entrance Timing**: Activate simplification **AFTER** the entrance animation of the first obscuring modal is complete. This avoids a visual "pop" during the fade-in.
- **Exit Timing**: Restore the full-fidelity map **AS SOON AS** the closing animation of the last obscuring modal begins. This provides a premium feel by letting the user see the world return while the overlay disappears.
- **Persistence**: The simplified state must remain active as long as any obscuring modal exists in the LIFO stack.

---

## 📏 Layering & Z-Index Governance

To prevent "z-index wars" and ensure consistent interaction, all layers MUST follow the centralized scale defined in `_variables.scss`.

### 1. Standard Layers (0-999)

- **Base**: 0 (Map, Phaser Background).
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
  - Interactive Content: `z-index: var(--z-base)` (0)

---

## 🛠️ Aesthetic Audit Checklist

For a full verification, consult the centralized **[Aesthetic Audit Checklist](./audit_checklist.md)**.

1. `[ ]` **Hybrid Check**: Are modern frames combined with pixel-art content?
2. `[ ]` **Typography**: Is `@include pixelated;` used for all pixel fonts?
3. `[ ]` **Prefixes**: Are `-webkit-backdrop-filter` and other prefixes present?
4. `[ ]` **Stacking**: Does the modal behavior follow LIFO rules?
