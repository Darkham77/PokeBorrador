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

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
