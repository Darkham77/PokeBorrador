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

---

## 🎨 Styling Standards

### 1. Premium HUD Glassmorphism

- **HUD Headers/Main Bars**: Use `@include glass-solid(linear-gradient(180deg, #161a2e 0%, #0a0c14 100%))`.
- **Borders**: Always use a subtle `1px solid rgba(255, 255, 255, 0.15)`.

### 2. Pixel-Perfect Typography (Sharpness Mandate)

- **MANDATORY**: Disable font smoothing for pixel fonts using `@include pixelated;`.
- **FORBIDDEN**: Relying on default browser antialiasing for game-world text.
- **Text-Shadow**: Use hard offsets (e.g., `2px 2px 0px rgba(0,0,0,0.5)`) with **zero** blur radius.
- **Centering**: Use **Flexbox/Grid** for centering. Avoid `transform: translate(-50%, -50%)` as it causes subpixel blurring in Chrome.
- **Font Size**: Prefer **12px or larger** for 'Press Start 2P' to ensure integer grid alignment.

### 3. Safari Compatibility (Prefix Mandate)

- **REQUIRED**: Always precede `backdrop-filter` with `-webkit-backdrop-filter`.
- **Standard Parity**: Pair vendor prefixes with standard properties (e.g., `-webkit-line-clamp` + `line-clamp`).

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

---

## 📖 Content Readability

- **Max-Width**: Articles must have a max-width of `1000px`.
- **Padding**: Use `32px` internal padding for main article content.

---

## 🛠️ Aesthetic Audit Checklist

1. `[ ]` **Hybrid Check**: Are modern frames combined with pixel-art content?
2. `[ ]` **Typography**: Is `@include pixelated;` used for all pixel fonts?
3. `[ ]` **Prefixes**: Are `-webkit-backdrop-filter` and other prefixes present?
4. `[ ]` **Stacking**: Does the modal behavior follow LIFO rules?
