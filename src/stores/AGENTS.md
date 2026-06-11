# Purpose

Manage shared reactive application state using Pinia.

## Ownership

State Architects / Frontend Developers.

## Local Contracts

- Strict data sanitization when updating/switching entities (e.g., active Pokemon movesets).
- Bypassing static browser alias loading (`@/`) in Node.js test runs using dynamic store loading.

## Work Guidance

- Zero serialization (`JSON.stringify`) in watch handlers to prevent severe CPU lag.
- Define explicit local type interfaces for mocks rather than using `any` (Zero-Any policy).
- Ensure explicit error propagation in dynamic dynamic imports (never silent `.catch(() => {})`).
- Synchronize player gender selection state during authentication (sign up only).
- When visual/state variables are modified, keep them atomic and fully initialized to prevent race conditions in HUD layers.

## Verification

- Run `npm run lint` and `npm run audit:full`.
- Verify memory footprint and FPS stability during intense store updates.

## Child DOX Index

- `debug/` - Stores managing offline CLI state injectors.
- `game/` - Primary loops, save game state manager.
