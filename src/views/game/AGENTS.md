# Purpose

Core game dashboard, map, and progression views.

## Ownership

Core Frontend / Gameplay Engineers.

## Local Contracts

- **Session Entry & Pending Awards Alert**: Upon mounting the primary game view (`MainGameView.vue`), the view must trigger `eventStore.checkPendingAwards(true)` to alert players with a toast notification if unclaimed competition awards exist in their profile.
- **Home Dashboard Continuous Flow**: `HomeView.vue` coordinates widgets into continuous main and sidebar streams, enforcing main column ordering (Events -> Gyms -> Missions -> Class Mastery), sidebar ordering (Breeding -> GTS Market -> Buffs -> Faction War -> Notifications), and prioritized mobile sequence (Events [1] -> Breeding [2] -> GTS Market [3] -> Faction War [4] -> Missions [5] -> Gyms [6] -> Active Buffs [7] -> Class Specialization & Levels [8, penultimate] -> Notifications [9, last]).
- **View-Level Entrance Animation Orchestration**: View entrance animations (e.g. GSAP fadeIn/slideUp) must be orchestrated exclusively at the container view level (`HomeView.vue`) rather than instantiating redundant GSAP lifecycle hooks within individual child widgets.
- **Map View Header Layout Pairing**: In `MapView.vue`, the top navigation bar pairs `MapPokemonCenterBanner` with `HomeBreedingWidget :columns="3"` using centered flexbox (`display: flex; justify-content: center; align-items: stretch; gap: 16px; flex-wrap: wrap;`), preventing cards from stretching across ultrawide monitors and aligning heights harmoniously above the region route grid.
- **Main Game Tabs Content Delegation**: Tab content rendering in `MainGameView.vue` is delegated to `MainGameTabsContent.vue`, preserving `<KeepAlive>` state for core views while maintaining low cyclomatic complexity in the shell layout.

## Key Files

- `GymsView.vue`: Module implementation.
- [`GameView.vue`](./GameView.vue): Module implementation.
- [`HomeView.vue`](./HomeView.vue): Module implementation.
- [`MainGameTabsContent.vue`](./MainGameTabsContent.vue): Module implementation.
- [`MainGameView.vue`](./MainGameView.vue): Module implementation.
- [`MapView.vue`](./MapView.vue): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
