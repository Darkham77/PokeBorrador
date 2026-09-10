# Purpose

Stylesheets, palettes, and pixel polygon frame geometry for the UI-Demo technical showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `_variables.scss`: Color palettes for all 3 themes (`theme-vicio-dark`, `theme-wingull-light`, `theme-cyber-neon`) using capitalized Dart Sass functions (`Rgba`, `Radial-Gradient`).
- `_frames.scss`: CSS classes `.pv-frame-pill`, `.pv-frame-control`, `.pv-frame-btn`, and `.pv-frame-panel` mapped to Bresenham clip-path polygon variables.
- `ui_demo.scss`: Modular SCSS styling for all showcase components and catalog sections.
- Zero manual CSS transitions or `@keyframes`; all animations must use GSAP.

## Verification

- `npm run lint`
- `npm run audit`

## DOX Directory Navigation Index

- Parent: [../AGENTS.md](../AGENTS.md)
