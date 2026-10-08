# Purpose

This directory contains multimedia, sprite existence, and sprite collision auditors for Pokémon and inventory items.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution.

## Key Files

- [audit_item_sprite_collisions.ts](./audit_item_sprite_collisions.ts): Verifies that inventory items do not inadvertently share sprite assets across distinct functional items.
- [validate_asset_usage.ts](./validate_asset_usage.ts): Audits Vue component templates, TypeScript logic, and static data to prevent asset resolver bypasses and unmediated asset path strings.
- [validate_sprites.ts](./validate_sprites.ts): Audits sprite files and animations across standard and shiny variants.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
