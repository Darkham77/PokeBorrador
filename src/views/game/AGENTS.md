# Purpose

Core game dashboard, map, and progression views.

## Ownership

Core Frontend / Gameplay Engineers.

## Local Contracts

- **Session Entry & Pending Awards Alert**: Upon mounting the primary game view (`MainGameView.vue`), the view must trigger `eventStore.checkPendingAwards(true)` to alert players with a toast notification if unclaimed competition awards exist in their profile.
- **Home Dashboard Continuous Flow**: `HomeView.vue` must coordinate widgets into continuous main and sidebar streams, avoiding inter-row height locks and enforcing the prioritized mobile ordering sequence (Events -> Breeding -> Gyms -> Factions -> Missions -> Notifications).
- **Map View Header Layout Pairing**: In `MapView.vue`, the top navigation bar pairs `MapPokemonCenterBanner` with `HomeBreedingWidget :columns="3"` using centered flexbox (`display: flex; justify-content: center; align-items: stretch; gap: 16px; flex-wrap: wrap;`), preventing cards from stretching across ultrawide monitors and aligning heights harmoniously above the region route grid.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
