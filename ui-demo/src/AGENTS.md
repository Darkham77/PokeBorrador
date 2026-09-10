# Purpose

Source files for the UI-Demo technical showcase, including application entry point and root layout.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `main.ts` initializes Pinia, official directives (`gsap-hover`, `gsap-loop`, `gsap-nick`), global tooltip (`PVTooltip`), and game stores.
- `App.vue` manages dynamic theme switching (`Vicio Dark`, `Wingull GBA Light`, `Cyber Neon`) and responsive pixel scaling.
- Direct relative imports must always include `.ts` extensions.

## Work Guidance

- Components must import canonical styles from `@/styles/_index.scss`.
- Zero manual CSS transitions or keyframes; use GSAP directives and composables.

## Verification

- `npm run lint`
- `npm run audit`

## DOX Directory Navigation Index

- [data/AGENTS.md](./data/AGENTS.md): Mock datasets and test fixtures.
- [logic/AGENTS.md](./logic/AGENTS.md): Universal Bresenham pixel polygon engine.
- [sections/AGENTS.md](./sections/AGENTS.md): Showcase section components.
- [styles/AGENTS.md](./styles/AGENTS.md): Theming, palettes, and frame geometry stylesheets.
