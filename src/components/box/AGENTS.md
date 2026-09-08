# Purpose

Manage the logic and assets of box.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Dual-Name Rendering Standard**: When displaying Pokémon in box cards or detail views:
  - If a custom `nickname` is set: Render the **nickname as large primary text** and the **official species name as a small subtitle underneath**.
  - If no `nickname` is set: Render the **official species name as large primary text in uppercase**.
- **Card Sprite Dynamic Centering & Non-Overlap Contract (`BoxPokemonCard.vue`, `_grid.scss`)**:
  - Sprites inside Pokemon cards MUST dynamically center vertically within the upper available card area above the footer rather than remaining rigidly pinned to the top border.
  - `.box-sprite-wrapper` MUST be a flexible container (`width: 100%; flex: 1 1 auto; min-height: 64px; display: flex; align-items: center; justify-content: center; position: relative; overflow: visible;`).
  - The footer info section (`.card-info`) MUST declare `flex-shrink: 0;` so when badges, dual types, or subtitles expand it, it naturally pushes the sprite container upward without truncating footer metrics.
  - A minimum vertical gap (`gap: 4px;`) MUST always be enforced between `.box-sprite-wrapper` and `.card-info` across all card variants (`.box-pokemon-card`, `.quick-card-override`) to guarantee they never collide or overlap.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
