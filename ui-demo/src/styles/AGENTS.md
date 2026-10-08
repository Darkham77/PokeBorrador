# Purpose

Stylesheets, palettes, and pixel polygon frame geometry for the UI-Demo technical showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `_variables.scss`: Color palettes for all 3 themes (`theme-vicio-dark`, `theme-wingull-light`, `theme-cyber-neon`) using capitalized Dart Sass functions (`Rgba`, `Radial-Gradient`).
- `_frames.scss`: CSS classes `.pv-frame-pill`, `.pv-frame-control`, `.pv-frame-btn`, and `.pv-frame-panel` mapped to Bresenham clip-path polygon variables.
- `ui_demo.scss`: Modular SCSS styling for all showcase components and catalog sections.
- Zero manual CSS transitions or `@keyframes`; all animations must use GSAP.

## Key Files

- [`_app_layout.scss`](./_app_layout.scss): Layout grid and container rules.
- [`_base.scss`](./_base.scss): Base typography and reset rules.
- [`_components.scss`](./_components.scss): Component styles bundle.
- [`_components_dialogs.scss`](./_components_dialogs.scss): Dialog and modal styling.
- [`_components_hud.scss`](./_components_hud.scss): Combat HUD styling.
- [`_components_pills.scss`](./_components_pills.scss): Elemental pills and tags styling.
- [`_frames.scss`](./_frames.scss): Frame geometry and clip paths.
- [`_variables.scss`](./_variables.scss): Theme variables and palettes.
- [`_view_battle.scss`](./_view_battle.scss): Battle arena showcase styles.
- [`_view_detail.scss`](./_view_detail.scss): Detail view showcase styles.
- [`_view_html_showcase.scss`](./_view_html_showcase.scss): HTML showcase layout styles.
- [`_view_inventory.scss`](./_view_inventory.scss): Inventory slot showcase styles.
- [`_view_login.scss`](./_view_login.scss): Login view showcase styles.
- [`_view_selection.scss`](./_view_selection.scss): Selection modal showcase styles.
- [`_view_team.scss`](./_view_team.scss): Team management showcase styles.
- [`ui_demo.scss`](./ui_demo.scss): Root stylesheet importing all partials.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- `npm run lint`
- `npm run audit`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
