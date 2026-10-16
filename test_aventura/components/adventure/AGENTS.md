# Purpose

This directory provides interactive adventure modal dialogs and overlays for Kanto exploration prototyping.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Modules here are local to `test_aventura` and decoupled from production modals.
- All interactive controls must specify descriptive HTML ID attributes.

## Key Files

- [`AdventureDebugModal.vue`](./AdventureDebugModal.vue): Developer debugging and teleportation modal.
- [`AdventureInventoryModal.vue`](./AdventureInventoryModal.vue): Adventure inventory and item inspection modal.
- [`AdventureModal.vue`](./AdventureModal.vue): Main adventure exploration interface container and orchestration modal.

## Work Guidance

- Keep UI styling self-contained or inherit from the suite theme.

## Verification

- `npm run auditor:dox-integrity`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
