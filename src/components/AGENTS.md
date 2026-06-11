# Purpose

Manage the visual user interface components, ensuring they align with the Hybrid Retro-Modern style of the Poke Vicio project.

## Ownership

Frontend UI Developers / UI Designers.

## Local Contracts

- Strict compliance with [ui_ux_standards.md](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/.agents/skills/project-standards/references/core/ui_ux_standards.md) and [sass_styling_manual.md](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/.agents/skills/project-standards/references/technical/sass_styling_manual.md).
- Zero template-level database queries or heavy computations.

## Work Guidance

- Use `@include pixelated` for retro assets (sprites, badges) to keep them sharp.
- Set container `image-rendering: pixelated` when rendering canvas or pixelated backgrounds.
- Prevent font layout clipping on pixelated fonts (`Press Start 2P`) by setting `line-height` to at least `1.5` or `1.6` and adding top padding.
- Implement micro-animations and state hover transitions exclusively using GSAP timelines/tweens in `@mouseenter` and `@mouseleave` handlers. CSS `transition` and `@keyframes` are forbidden for dynamic state transitions.
- Teleported tooltips must scale the inner wrapper, not the parent, to avoid breaking absolute calculations.

## Verification

- Run `npm run lint` and `npm run audit:full` to verify component type safety and syntax.
- Visual inspection in browser across different resolutions (using mobile viewport targets if necessary).

## Child DOX Index

This folder contains:

- `admin/` - Administrative debugging HUD controls.
- `adventure/` - Exploration, map grids, and movement.
- `auth/` - Separate login and signup views (no gender selector in login).
- `battle/` - Phaser canvases, arena controls, and FSM HUD layers.
- `box/` - Box grids and storage management.
- `breeding/` - Daycare, eggs, and dynamic visual matrices.
- `common/` - Reusable UI base elements (modals, buttons, cards).
- `events/` - Event visual notifications and animations.
- `evolution/` - Evolution visual sequences and modals.
- `game/` - Core canvas, overlays, and game-loop interfaces.
- `gyms/` - Gym status, badge grid, and rematches.
- `inventory/` - Inventory item slots and description cards.
- `map/` - Overworld map visuals.
- `market/` - Shop grids and GTS trade interface.
- `modals/` - Teleported modals extending `BaseModal`.
- `overlays/` - Screen-wide overlays (loading gates).
- `pokedex/` - Pokedex list, filters, and detail sheets.
- `pokemon/` - Sibling sprite overlap arrays.
- `pokemon-detail/` - Pokemon stats, movesets, and grade frames.
- `profile/` - Trainer profiles and customizing skins.
- `shared/` - Shared layouts and layout shells.
- `social/` - Friends, private messages, and chat lists.
- `team/` - Team builder, drag-and-drop slots, and grid lists.
- `ui/` - Layout panels, menus, and navigation tabs.
- `war/` - Faction control grids and war status cards.
