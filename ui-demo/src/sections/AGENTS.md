# Purpose

Individual interactive section components composing the UI-Demo technical showcase.

## Ownership

Frontend / UI Engineers.

## Local Contracts

- `Sec1NavigationTabs.vue`: Section 1 - Navigation tabs, category pills, and server mode toggle.
- `Sec2FormControls.vue`: Section 2 - Inputs, dropdown select, password, retro checkbox, and steppers.
- `Sec3InventorySlots.vue`: Section 3 - Backpack recessed slots and 2x2 combat moves grid.
- `Sec4ActionButtons.vue`: Section 4 - Action buttons (7 semantic variants, 4 scales XS/SM/MD/LG, icon buttons).
- `Sec5DialogsModals.vue`: Section 5 - GBA Professor Oak dialog box and Satoshi Trainer Card modal window.
- `Sec6CombatHud.vue`: Section 6 - Combatant HP/EXP HUD (Wingull Lv12, Pikachu Lv25, 6-ball status bar).
- `Sec7ElementalPills.vue`: Section 7 - All 18 elemental type pills, status badges (PAR/PSN/BRN/FRZ/SLP), and gender tags.
- `Sec8LoginDemo.vue`: Section 8 - Unified login showcase with floating logo, GBA level 4 frame, and button catalog.
- `Sec9TeamCards.vue`: Section 9 - Team management cards with 3px polygon frames, badges, and action buttons.
- `Sec10SelectionModal.vue`: Section 10 - Pokémon selection modal window with filters, status bars, and checkboxes.
- `Sec11BattleDock.vue`: Section 11 - Real-time battle dock with quick team, 2x2 moves, central Poké Ball, and quick bag.
- `Sec12PokemonDetail.vue`: Section 12 - Technical Pokémon inspection linking `UnifiedPokemonDetailModal.vue`.

## Key Files

- `Sec10SelectionFilters.vue`: Module implementation.
- `Sec10SelectionItem.vue`: Module implementation.
- `Sec13InventoryModal.vue`: Module implementation.
- `Sec14InputsShowcase.vue`: Module implementation.
- `Sec15LiveInspector.vue`: Module implementation.
- `Sec9TeamMemberCard.vue`: Module implementation.
- `sec9TeamTypes.ts`: Module implementation.
- [`Sec10SelectionModal.vue`](./Sec10SelectionModal.vue): Module implementation.
- [`Sec11BattleDock.vue`](./Sec11BattleDock.vue): Module implementation.
- [`Sec12PokemonDetail.vue`](./Sec12PokemonDetail.vue): Module implementation.
- [`Sec1NavigationTabs.vue`](./Sec1NavigationTabs.vue): Module implementation.
- [`Sec2FormControls.vue`](./Sec2FormControls.vue): Module implementation.
- [`Sec3InventorySlots.vue`](./Sec3InventorySlots.vue): Module implementation.
- [`Sec4ActionButtons.vue`](./Sec4ActionButtons.vue): Module implementation.
- [`Sec5DialogsModals.vue`](./Sec5DialogsModals.vue): Module implementation.
- [`Sec6CombatHud.vue`](./Sec6CombatHud.vue): Module implementation.
- [`Sec7ElementalPills.vue`](./Sec7ElementalPills.vue): Module implementation.
- [`Sec8LoginDemo.vue`](./Sec8LoginDemo.vue): Module implementation.
- [`Sec9TeamCards.vue`](./Sec9TeamCards.vue): Module implementation.

## Work Guidance

- Always adhere to the 3px canonical retro-modern pixel standard and Bresenham rasterization clip paths.
- Maintain strict typing and exclusive GSAP animations (zero CSS `@keyframes` or `transition:`).

## Verification

- `npm run lint`
- `npm run audit`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
