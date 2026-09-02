# Home Components Module

This directory contains modular Vue components that render the Home Hub dashboard (`HomeView.vue`).

## Directory Structure

- `HomeEventsSection.vue`: Active global events single-row grid, pending rewards claims, dynamic slot upcoming event filling via canonical `EventCard`, and collapsible schedule / past events archive.
- `HomeBreedingWidget.vue`: Daycare incubator egg cards with live progress bars and daycare quick action.
- `HomeGymsProgress.vue`: Kanto's 8 gym badges visual progression bar with conquered state and challenge shortcut.
- `HomeClassMissionsWidget.vue`: Player class specialization status, account level/XP, class rank XP progress bar, and next class perks/missions unlock list via canonical `ProfileXpCard.vue`.
- `HomeActiveBuffsWidget.vue`: Live active consumable timers (repel, incenses, lucky egg, amulet coin, scanner, tool durability) and server event multipliers with bag shortcut and diacritic-safe typography.
- `HomeEconomyWidget.vue`: Focused GTS market monitor rendering real-time sale alerts and a live preview of the 5 most recent community listings with enlarged 44px sprites and direct modal navigation.
- `HomeFactionWar.vue`: Territorial dominance status bar (Unión vs Poder), war points, war coins, and war shop shortcut.
- `HomeNotificationsFeed.vue`: Activity feed for game notifications and combat logs with vertical scrollbar after 10 items.

## Local Contracts

- **Unified Card Header Actions**: All top-level action buttons located in card headers MUST use the `.card-action-btn` style (pixel font 8px, height 28px, border radius 6px, consistent hover glow).
- **Continuous Masonry Layout Flow**: The Home Hub is structured in a continuous 2-column layout (`minmax(0, 1fr) 380px`) rather than isolated grid rows, allowing sidebar widgets (Breeding, Economy, Buffs, Faction War, Notifications) to stack tightly without dead vertical gaps when the main column expands.
- **Mobile Responsive Hierarchy**: In single-column viewports (<= 1100px), column containers must use `display: contents` and CSS `order` sequencing to enforce the strict mobile sequence: 1. `HomeEventsSection`, 2. `HomeBreedingWidget`, 3. `HomeEconomyWidget` (GTS Market), 4. `HomeFactionWar`, 5. `EventMissions` (Daily Missions), 6. `HomeGymsProgress`, 7. `HomeActiveBuffsWidget`, 8. `HomeClassMissionsWidget` (Class Specialization & Account/Class Levels, strictly penultimate), and 9. `HomeNotificationsFeed` (strictly last).
- **GBA Font Typography Compliance**: All text elements in home widgets must strictly adhere to the project's canonical pixel font standard (`@include pixelated;` / `var(--font-pixel)`) preserving lowercase diacritics as governed in `@/project-standards`.
- **GTS Market Live Feed Integration**: `HomeEconomyWidget.vue` renders a streamlined preview of the latest 5 active listings from other players with enlarged 44px sprites, visible overflow, and direct routing to `GlobalMarketModal`, omitting redundant HUD balance chips.
- **Cross-View Shared Widget Parametrization**: When `HomeBreedingWidget` is integrated outside the Home Hub (such as in `MapView.vue`), it must support a `columns` prop (`2 | 3`, default `2`). Default `columns: 2` guarantees full 100% width filling inside the 380px sidebar, while `columns: 3` enforces a compact, 3-column layout bounded by `max-width: 640px` to prevent horizontal card stretching.
