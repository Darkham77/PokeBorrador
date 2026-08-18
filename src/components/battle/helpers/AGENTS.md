# Purpose

Manage visual battle animation sequences, GSAP timeline bridges, and combatant action helpers for battle UI components.

## Ownership

Frontend Developers / Battle UI Engineers.

## Local Contracts

- Encapsulate GSAP animation choreographies and bridge abstractions cleanly away from top-level SFCs.
- Maintain 100% strict TypeScript types with zero `any` and zero type assertion bypasses.

## Work Guidance

- Use GSAP timelines for visual choreographies (`playTrainerAnimation`, `playActionAnimation`).
- Forward all animation bridge methods via typed mapping helpers (`createBattleAnimationsBridge`).

## Verification

- Run `npm run lint` and `npm run test`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
