# Purpose

Manage the logic and assets of items.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **itemEffectHandlers.ts**: Pure stateless handlers for consumable items (potions, revives, status cures, PP restorers, evolution stones).
- **itemEffects.ts**: Main registry mapping item IDs to dynamic effects or handlers.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
