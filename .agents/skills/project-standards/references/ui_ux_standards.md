# UI/UX & Aesthetic Standards

This manual defines the visual identity and interaction patterns of the Poké Vicio project, ensuring a premium **Hybrid Retro-Modern** experience.

---

## ✨ The Hybrid Retro-Modern Mandate

We prioritize a deliberate contrast between modern, sleek UI shells and classic, pixel-perfect content.

### 1. Modern UI Shell (Containers & Layouts)

- **REQUIRED**: Use state-of-the-art UI techniques for layouts, cards, and backgrounds.
- **Techniques**: Glassmorphism (`-webkit-backdrop-filter: Blur(); backdrop-filter: Blur();`), HSL gradients, smooth shadows, and fluid transitions.
- **Goal**: The "frame" must feel premium, modern, and reactive.

### 2. Pixel Art Content (The "Game Heart")

- **MANDATORY**: All game-world elements **MUST** be Pixel Art (Sprites, Icons, Typography).
- **FORBIDDEN**: Modern high-res vector icons (SVG) or smooth fonts for primary game data.
- **EXCEPTION: Premium Branding**: High-res logos or emblems **SHOULD** use smooth rendering (`image-rendering: auto;`) to enhance the contrast.
- **GPU Persistence Rule**: To prevent "snapping" from smooth to pixelated after CSS transitions (especially on environmental backgrounds), use `image-rendering: auto` explicitly in `smooth` mixins and force GPU layer persistence with `will-change: filter, transform;` and `transform: TranslateZ(0);`.

---

## 🎨 Styling Standards

### 1. Premium HUD Glassmorphism

- **HUD Headers/Main Bars**: Use `@include glass-solid(linear-gradient(180deg, #161a2e 0%, #0a0c14 100%))`.
- **Borders**: Always use a subtle `1px solid rgba(255, 255, 255, 0.15)`.

### 2. Pixel-Perfect Typography (Sharpness Mandate)

- **Grid Alignment**: Pixel fonts (especially `Press Start 2P`) MUST strictly use multiples of their native 8px design grid (**8px, 16px, 24px, 32px**).
- **Anti-Alias Ban**: ALWAYS apply `@include pixelated;` to pixel fonts to force `-webkit-font-smoothing: none !important`.
- **FORBIDDEN**:
  - Intermediate sizes (9px, 10px, 11px, 13px, 15px) as they trigger subpixel interpolation.
  - Using `text-shadow` with any blur radius (must be 0px).
- **Centering**: Use **Flexbox/Grid** for centering. Avoid `transform: translate(-50%, -50%)` as it causes subpixel blurring in Chrome.
- **BST Aesthetics**: Game-world data (Stats, IVs, Levels) MUST prioritize these sharp pixelated tokens to reinforce the "Retro Heart".

### 3. Safari Compatibility (Prefix Mandate)

- **REQUIRED**: Always precede `backdrop-filter` with `-webkit-backdrop-filter`.
- **Standard Parity**: Pair vendor prefixes with standard properties (e.g., `-webkit-line-clamp` + `line-clamp`).

### 4. Interactive Pills & Badges

- **High-Density Layouts**: When horizontal space is limited (e.g., within Grid cards), use **Vertical Pills**.
- **Vertical Pill Standard**: Use `writing-mode: vertical-rl` and `text-orientation: upright` for the text, combined with a large icon (16-18px) positioned at the top.
- **Glassmorphism**: Always apply `@include glass-solid` with a thin themed border (`rgba(79, 172, 254, 0.4)` for Fishing).

---

## 🎭 Animation & Motion Standards

### 1. Thematic Bobbing (Buoy Effect)

- **CONTEXT**: Use for maritime, fishing, or water-based UI elements.
- **Implementation**: Combine subtle `TranslateY` (4px offset) with a slight `Rotate` (1-2 degrees).
- **MANDATORY**: Use **Capitalized** `TranslateY()` and `Rotate()` for SASS compliance.
- **Cycle**: A slow 4-second `infinite ease-in-out` loop is recommended for an organic feel.
- **Night Illumination Overrides**: Weather effects that use bright/white overlays (fog, snow, blizzard) MUST implement night-specific overrides using dark tints (`rgba(0,0,0,x)`) to prevent the atmosphere from unnaturally illuminating the night cycle.

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

### 3. Notifications & Toasts

- **MANDATORY**: Toasts must occupy the highest layer (`z-index: 999,999`).

### 4. Modal Variants & Aesthetics

The `BaseModal.vue` component supports parameterized aesthetics to maintain consistency:

- **variant="modern" (Default)**: Sleek, glassmorphism-focused, subtle borders.
- **variant="retro"**: High-contrast 2px yellow border (`var(--yellow)`), 30px corner radius, and **20px** default internal padding. Use for gameplay, shops, and settings.
- **hide-header**: Use to remove the header bar for content-focused modals. The close button (`X`) will automatically transition to a floating position (`modal-close-btn-floating`).
- **padding="raw"**: Use for full-bleed content (e.g., Shop/Inventory grids). The `retro` variant respects this to avoid double-padding.

### 5. Premium 3D Action Buttons

Standardized via the `@mixin btn-vicio-primary` and `.btn-vicio-primary` class:

- **Aesthetic**: Solid 3D depth using `box-shadow: 0 4px 0 #b45309` (not fuzzy/rgba shadows).
- **Interaction**:
  - **Hover**: 1px upward translation (`TranslateY(-1px)`) and subtle brightness boost.
  - **Active**: 2px downward translation (`TranslateY(2px)`) with shadow reduction to 2px, simulating a physical press.
- **Typography**: Must use `'Press Start 2P'` with `@include pixelated`.
- **Constraint**: Primary action buttons (yellow) MUST follow this pattern to maintain visual parity.
- **Active State Unification**: Selected/Active buttons (`.active`) MUST preserve their 3D shadow depth. Use a 2px white solid border and a selection glow (`box-shadow`), but keep the dark bottom shadow to avoid a "flat" or "broken" look.
- **Atmospheric Clarity**: Weather effects (rain, snow, storm), environmental emojis, and atmospheric filters MUST be hidden for locked or restricted UI components (e.g., locked map routes). This maintains focus on playable areas and reduces cognitive noise.

> [!IMPORTANT]
> **Close Button Rule**: The "X" button MUST always be visible and correctly positioned in the top-right corner, regardless of variant or header visibility.

---

## 📖 Content Readability

- **Max-Width**: Articles must have a max-width of `1000px`.
- **Padding**: Use `32px` internal padding for main article content.

### 6. Modal Stack & Performance Synchronization

To ensure a seamless transition between full-map exploration and focused modal interactions:

- **Triggering Condition**: Only modals that obscure the background (those with overlays or full-screen) should trigger the "Simplified Map" mode.
- **Entrance Timing**: Activate simplification **AFTER** the entrance animation of the first obscuring modal is complete. This avoids a visual "pop" during the fade-in.
- **Exit Timing**: Restore the full-fidelity map **AS SOON AS** the closing animation of the last obscuring modal begins. This provides a premium feel by letting the user see the world return while the overlay disappears.
- **Persistence**: The simplified state must remain active as long as any obscuring modal exists in the LIFO stack.

---

## 🛠️ Aesthetic Audit Checklist

1. `[ ]` **Hybrid Check**: Are modern frames combined with pixel-art content?
2. `[ ]` **Typography**: Is `@include pixelated;` used for all pixel fonts?
3. `[ ]` **Prefixes**: Are `-webkit-backdrop-filter` and other prefixes present?
4. `[ ]` **Stacking**: Does the modal behavior follow LIFO rules?
