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

## Work Guidance

- Always adhere to the 3px canonical retro-modern pixel standard and Bresenham rasterization clip paths.
- Maintain strict typing and exclusive GSAP animations (zero CSS `@keyframes` or `transition:`).

## Verification

- `npm run lint`
- `npm run audit`

## DOX Directory Navigation Index

- Parent: [../AGENTS.md](../AGENTS.md)
