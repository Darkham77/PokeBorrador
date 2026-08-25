# Purpose

Manage visual battle animation sequences, GSAP timeline bridges, and combatant action helpers for battle UI components.

## Ownership

Frontend Developers / Battle UI Engineers.

## Local Contracts

- Encapsulate GSAP animation choreographies and bridge abstractions cleanly away from top-level SFCs.
- Maintain 100% strict TypeScript types with zero `any` and zero type assertion bypasses.

## Work Guidance

- Use GSAP timelines for visual choreographies (`playTrainerAnimation`, `playActionAnimation`, `getTrainerIdleConfig`, `getIdleGroundedConfig`).
- **Trainer Visual Sequence**: `entering` (slide to center stage `x: 0, y: 0, scale: 1`), `idle` (dialogue presentation at center stage), `retreating` (slide to background `x: 340, y: -25, scale: 0.8`), `standing` (combat station), and `exiting` (off-screen exit with Rocket flee sound support).
- **Trainer Idle Animation**: Organic, subtle breathing animation (`getTrainerIdleConfig`) applied with `transformOrigin: 'bottom center'` so standing trainers and NPCs subtly breathe without moving their feet from their grounded shadow.
- Forward all animation bridge methods via typed mapping helpers (`createBattleAnimationsBridge`).

## Verification

- Run `npm run lint` and `npm run test`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
