# Home Components Module

This directory contains modular Vue components that render the Home Hub dashboard (`HomeView.vue`).

## Directory Structure

- `HomeEventsSection.vue`: Active global events single-row grid, pending rewards claims, dynamic slot upcoming event filling via canonical `EventCard`, and collapsible schedule / past events archive.
- `HomeBreedingWidget.vue`: Daycare incubator egg cards with live progress bars and daycare quick action.
- `HomeGymsProgress.vue`: Kanto's 8 gym badges visual progression bar with conquered state and challenge shortcut.
- `HomeFactionWar.vue`: Territorial dominance status bar (Unión vs Poder), war points, war coins, and war shop shortcut.
- `HomeNotificationsFeed.vue`: Activity feed for game notifications and combat logs with vertical scrollbar after 10 items.

## Local Contracts

- **Unified Card Header Actions**: All top-level action buttons located in card headers MUST use the `.card-action-btn` style (pixel font 8px, height 28px, border radius 6px, consistent hover glow).
- **Continuous Masonry Layout Flow**: The Home Hub is structured in a continuous 2-column layout (`minmax(0, 1fr) 380px`) rather than isolated grid rows, allowing sidebar widgets (Breeding, Faction War, Notifications) to stack tightly without dead vertical gaps when the main column expands.
- **Mobile Responsive Hierarchy**: In single-column viewports (<= 1100px), column containers must use `display: contents` and CSS `order` sequencing so that `HomeBreedingWidget` (Daycare/Breeding) is ALWAYS placed second (`order: 2`) immediately below `HomeEventsSection` (`order: 1`).
- **Canonical EventCard Reuse**: `HomeEventsSection.vue` reuses the canonical `EventCard.vue` component directly for both active and upcoming events, eliminating duplicate card templates.
