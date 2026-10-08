# Purpose

Manage the logic and assets of layouts.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Media Query Cascade & Stylelint Order Contract**:
  - Declarations (base desktop styles such as `display: none !important;`) MUST precede responsive mixins with blocks (`@include responsive(...) { display: flex !important; }`).
  - Stylelint `order/order` configuration differentiates `hasBlock: false` (declarative mixins) from `hasBlock: true` (block mixins like media queries) placed after declarations to protect mobile cascade overrides.

## Key Files

- `_hud.scss`: Module implementation.
- `_navigation.scss`: Module implementation.
- `_screens.scss`: Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [hud/](./hud/AGENTS.md): Domain module documentation for hud.
