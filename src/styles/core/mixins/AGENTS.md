# Purpose

System mixins, utilities, and helper functions for styling.

## Ownership

Frontend Developers.

## Local Contracts

- Must only contain reusable mixins and functions without outputting CSS code directly (to avoid duplicate code generation).
- **Strict Mixin Domain Separation (Typography vs. Sprite Rendering)**:
  - `@mixin pixelated` (in `_layout.scss`) is exclusively for **typography and font smoothing** (`font-family: var(--font-pixel)`, `-webkit-font-smoothing: none`).
  - `@mixin sprite-render` (in `_gpu.scss`) is exclusively for **pixel-art sprite images and textures** on GPU layers (`image-rendering: pixelated`, `contain: layout style paint`).
  - Applying `@include pixelated` to `<img>` tags or visual sprite wrappers is strictly prohibited as it does not set `image-rendering` and leads to compositor bilinear blur during CSS/GSAP transforms.
- **Pixel Font Line-Height & Multiline Inheritance (`_layout.scss`)**:
  - `@mixin pixelated` and `@mixin pixelated-proportional` enforce a safe base `line-height: 1.35` to ensure multiline pixelated text inherits sufficient vertical spacing.
  - Overriding text containers or headings with destructive `line-height: 1` or `line-height: 1.1` is strictly prohibited on elements that can wrap across multiple lines, preventing pixel glyph collisions.
- **Unified Card & Empty-State Mixins (`_shell.scss`)**:
  - Home dashboard cards and widgets must reuse `@mixin home-section-card` to standardize card surface geometry, padding, shadows, and backdrop filters.
  - Dashed placeholder and unconfigured states must reuse `@mixin empty-state-card` for consistent empty-state layout and button styling.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
