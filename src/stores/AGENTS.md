# Purpose

Manage shared reactive application state using Pinia.

## Ownership

State Architects / Frontend Developers.

## Local Contracts

- Strict data sanitization when updating/switching entities: auto-complete up to 4 moves with STAB guarantee, deduplicate via `Set`, filter empty/invalid entries.
- Bypassing static browser alias loading (`@/`) in Node.js test runs using dynamic store loading.

## Work Guidance

- Zero serialization (`JSON.stringify`) in watch handlers to prevent severe CPU lag.
- Define explicit local type interfaces for mocks rather than using `any` (Zero-Any policy).
- Ensure explicit error propagation in dynamic imports (never silent `.catch(() => {})`).
- **Gender is a Save Property**: The player's gender (`'h'` | `'m'`) is set once at signup and persists in the save. Login flows MUST NEVER ask for gender — only signup/registration forms include the gender selector. Use separate components for login (no gender) and signup (with gender).
- When visual/state variables are modified, keep them atomic and fully initialized to prevent race conditions in HUD layers.

## Verification

- Run `npm run lint` and `npm run audit:full`.
- Verify memory footprint and FPS stability during intense store updates.

## Child DOX Index

- [battle/](./battle/AGENTS.md): Battle engine state, buffs, and combatant shadows.
- [debug/](./debug/AGENTS.md): Stores managing offline CLI state injectors.
- [game/](./game/AGENTS.md): Primary loops, save game state manager.
- [inventory/](./inventory/AGENTS.md): Player inventory, helper utilities, and shop actions.
- [player/](./player/AGENTS.md): Character classes, cosmetic frame selectors, and profiles.
- [social/](./social/AGENTS.md): Chat logs, social networks, and cosmetic frames.
