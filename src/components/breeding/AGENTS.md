# Purpose

Manage the logic and assets of breeding.

## Ownership

Frontend Developers / Systems Engineers.

## Directory Structure

- `BreedingSummary.vue`: Daycare summary panel showing active pairs and breeding rate.
- `DaycareSlot.vue`: Single daycare Pokémon slot for depositing/withdrawing breeding parents.
- `DaycareSlotFilled.vue`: Filled daycare slot card displaying deposited Pokémon sprite, IVs, nature tooltip, vigor bar, held item, and withdraw action.
- `EggWarehouse.vue`: Warehouse grid component displaying stored eggs, capacity badge, and scanner cooldown.
- `EggWarehouseCard.vue`: Atomic egg card rendering egg sprite, scanned IV badge, grade badge, 6-stat IV grid, price, and actions.
- `FossilCloning.vue`: Fossil resurrection laboratory view.
- `HatchAnimationModal.vue`: Egg hatching animation modal with step counters and reveal sequence.
- `HatchEggCrackStage.vue`: Egg stage and glowing ring visualization for hatching scene.
- `HatchRevealContent.vue`: Post-hatch announcement, stat card, and confirmation action button.
- `HatchStatsCard.vue`: Stats card for newly hatched Pokémon displaying IVs, nature, and ability.
- `IncubatingEggs.vue`: Active incubator slots view showing egg incubation progress and walk steps.
- `IncubatingEggCard.vue`: Atomic incubating egg card rendering egg sprite, shiny indicator, name, step progress bar, and hatch action button.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Hatch Animation Baby Species Parity Mandate**: When preparing the visual preview in `HatchAnimationModal.vue` (`prepareResult`), the component MUST resolve the species ID through `getEggSpecies(rawSpeciesId)` ensuring 1:1 visual parity with the baby stage, sprite, and stats created in the final save. Displaying evolved parent forms during the hatching sequence is strictly forbidden.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
