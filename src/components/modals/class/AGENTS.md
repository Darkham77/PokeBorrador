# Purpose

Sub-modals and selectors for trainer class management and stats.

## Ownership

Frontend Developers.

## Local Contracts

- Handles layouts, class descriptions, and nodes rendering for the trainer class tree selection.
- `ClassDashboard.vue`: Class management dashboard displaying trainer avatars (with direct interactive gender selection, locked cooldown states, and confirmation warning), level requirements, bonuses, and class missions. Gender switches are bounded by the 30-day identity cooldown and immediately persist to `gameStore.state.gender` and `gameStore.state.last_renamed_at`.
- `ClassDashboardAbilityItem.vue` & `ClassDashboardPenaltyItem.vue`: Modular child components rendering individual class bonuses (with level lock state, requirement hints, and level badges) and penalties with self-contained hover animations.
- `ClassSelectionCard.vue`: Dedicated interactive card for trainer class preview, hover motion, pros/cons list with tooltips, and class selection button.

## Key Files

- `ClassDashboard.styles.scss`: Module implementation.
- `ClassDashboardSidebar.vue`: Module implementation.
- `classSelectionTypes.ts`: Module implementation.
- [`ClassDashboard.vue`](./ClassDashboard.vue): Module implementation.
- [`ClassDashboardAbilityItem.vue`](./ClassDashboardAbilityItem.vue): Module implementation.
- [`ClassDashboardPenaltyItem.vue`](./ClassDashboardPenaltyItem.vue): Module implementation.
- [`ClassSelectionCard.vue`](./ClassSelectionCard.vue): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
