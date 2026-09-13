# Purpose

Internal developer tooling and diagnostic editor views accessible strictly in development mode (import.meta.env.DEV).

## Ownership

Core Frontend & Asset Pipeline Engineers.

## Local Contracts

- **DEV-Only Isolation Mandate**: All views and components under this directory MUST be conditionally loaded or gated by `import.meta.env.DEV`. They must never be bundled into or accessible in production builds.
- **Lazy Routing**: Views must be loaded lazily via `resilientRouteComponent(() => import(...))` to avoid bundle bloat.
- **Standardized Navigation**: Must provide intuitive return paths back to the main game (`/`) or developer menus.
- **Shadow Editor Interaction Contract**: `DevShadowEditorView` MUST provide dual control mechanisms: precise sliders and numeric inputs (`feetX`, `feetY` [0..1]) alongside direct interactive canvas drag-and-drop on the sprite box, a flying mode toggle (`isFlying`), and an explicit reset button restoring defaults.
- **Standalone Sandbox & Dev Route Decoupling Mandate (`isStandaloneDevPage`)**: Developer views (such as `/dev/shadow-editor`) are standalone full-screen sandboxes that MUST operate without standard player session prerequisites (such as having an active Pokémon party in Pinia or listening to production game bus loops). Main app layouts and navigation bars MUST detect `isStandaloneDevPage` to suppress player UI chrome (top bars, joystick, side menus) and prevent runtime crashes when loaded in isolated developer environments.

## Work Guidance

- Use high-contrast retro-modern styling adhering to global design tokens.
- Implement efficient pagination and virtualized/paginated grids (50 entities per page) to ensure smooth 60fps performance when rendering hundreds of active sprite entities.

## Verification

- Run `npm run lint` and `npm run audit`.
- Verify DEV route protection by asserting that access in production builds redirects or does not exist.

## Child DOX Index

- [components/AGENTS.md](components/AGENTS.md) - Reusable developer calibration and diagnostic components.
- [utils/AGENTS.md](utils/AGENTS.md) - Developer utility helpers for clipboard and calibration synchronization.
