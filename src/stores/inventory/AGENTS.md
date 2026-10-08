# Purpose

Track items, transaction states for shops, and execution of inventory actions.

## Ownership

Systems Designers / Inventory Programmers.

## Local Contracts

- Deduplicate item lists via TypeScript typings and maintain strong schema validation.
- Perform safe quantity subtraction to prevent negative quantities.

## Key Files

- `inventory.ts`: Module implementation.
- `inventoryActionHelpers.ts`: Module implementation.
- `inventoryHelpers.ts`: Module implementation.
- `inventoryUseAction.ts`: Module implementation.
- `shop.ts`: Module implementation.

## Work Guidance

- Items are loaded dynamically using the item database definitions.
- Ensure shop actions perform safety checks on money variables.

## Verification

- Run `npm run test:node` and standard lint checks.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
