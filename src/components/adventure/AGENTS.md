# Purpose

Manage the logic and assets of adventure.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Adventure Modular Controls (`AdventureDirectionPad.vue`, `AdventureDirectionButton.vue`, `AdventureCheatPanel.vue`, `AdventureCheatTeamCard.vue`, `AdventureManualSidebar.vue`)**: Components encapsulate directional travel controls, sandbox item injection, team passives, active field moves, and event logs for adventure test simulations. `AdventureDirectionButton.vue` isolates directional buttons, icons, and HM requirement badges across all 4 movement columns. `AdventureCheatTeamCard.vue` encapsulates active team Pokémon metrics and move slots.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
