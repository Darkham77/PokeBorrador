# Purpose

Manage the logic and assets of adventure.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Adventure Modular Controls (`AdventureDirectionPad.vue`, `AdventureDirectionButton.vue`, `AdventureCheatPanel.vue`, `AdventureCheatTeamCard.vue`, `AdventureManualSidebar.vue`)**: Components encapsulate directional travel controls, sandbox item injection, team passives, active field moves, and event logs for adventure test simulations. `AdventureDirectionButton.vue` isolates directional buttons, icons, and HM requirement badges across all 4 movement columns. `AdventureCheatTeamCard.vue` encapsulates active team Pokémon metrics and move slots.

## Key Files

- `AdventureEventModal.vue`: Module implementation.
- `PreTravelModal.vue`: Module implementation.
- `adventureDirectionTypes.ts`: Module implementation.
- [`AdventureCheatPanel.vue`](./AdventureCheatPanel.vue): Module implementation.
- [`AdventureCheatTeamCard.vue`](./AdventureCheatTeamCard.vue): Module implementation.
- [`AdventureDirectionButton.vue`](./AdventureDirectionButton.vue): Module implementation.
- [`AdventureDirectionPad.vue`](./AdventureDirectionPad.vue): Module implementation.
- [`AdventureManualSidebar.vue`](./AdventureManualSidebar.vue): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
