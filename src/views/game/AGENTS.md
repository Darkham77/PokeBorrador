# Purpose

Core game dashboard, map, and progression views.

## Ownership

Core Frontend / Gameplay Engineers.

## Local Contracts

- **Session Entry & Pending Awards Alert**: Upon mounting the primary game view (`MainGameView.vue`), the view must trigger `eventStore.checkPendingAwards(true)` to alert players with a toast notification if unclaimed competition awards exist in their profile.
- **Home Dashboard Continuous Flow**: `HomeView.vue` coordinates widgets into continuous main and sidebar streams, enforcing main column ordering (Events -> Gyms -> Missions -> Class Mastery), sidebar ordering (Breeding -> GTS Market -> Buffs -> Faction War -> Notifications), and prioritized mobile sequence (Events [1] -> Breeding [2] -> GTS Market [3] -> Faction War [4] -> Missions [5] -> Gyms [6] -> Active Buffs [7] -> Class Specialization & Levels [8, penultimate] -> Notifications [9, last]).
- **Map View Header Layout Pairing**: In `MapView.vue`, the top navigation bar pairs `MapPokemonCenterBanner` with `HomeBreedingWidget :columns="3"` using centered flexbox (`display: flex; justify-content: center; align-items: stretch; gap: 16px; flex-wrap: wrap;`), preventing cards from stretching across ultrawide monitors and aligning heights harmoniously above the region route grid.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
