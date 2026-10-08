# Purpose

Manage the logic and assets of map.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

### Directory Structure

- `MapCard.vue`: Main route card orchestrator rendering background visuals, atmosphere, and subcomponents.
- `MapCardCyclePill.vue`: Environmental cycle, season, and weather status pill in top right corner.
- `MapCardGuardianBadge.vue`: Territorial guardian badge in top left corner.
- `MapCardHeader.vue`: Route name and description banner.
- `MapCardLeftPills.vue`: Bottom-left action pills (war dominance, fishing, archaeology).
- `MapCardLockOverlay.vue`: Route lock overlay and reason banner for locked and safari-restricted locations.
- `MapCardSpawns.vue`: Route wild Pokémon spawns 3x3 grid.
- `MapCardSpawnsTrigger.vue`: Animated Pokéball trigger for the Route Spawns modal in bottom right corner.
- `MapGrid.vue`: Responsive grid container for all route MapCards.
- `MapPokemonCenterBanner.vue`: Route Pokémon Center healing and daycare status banner.
- `MapStatusSummary.vue`: Top summary banner for weather, events, and world conditions.

- Follow standard repository modularity guidelines.
- **MapCard Modularity & Clean Template Decomposition (`MapCard.vue`, `MapCardLockOverlay.vue`)**: Encapsulates route lock checking, safari restriction labels, and overlay rendering into `MapCardLockOverlay.vue`, delegating styling and class computation to reactive computed properties to eliminate template cognitive complexity.

## Key Files

- `MapCard.styles.scss`: Module implementation.
- `useMapCardState.ts`: Module implementation.
- [`MapCard.vue`](./MapCard.vue): Module implementation.
- [`MapCardCyclePill.vue`](./MapCardCyclePill.vue): Module implementation.
- [`MapCardGuardianBadge.vue`](./MapCardGuardianBadge.vue): Module implementation.
- [`MapCardHeader.vue`](./MapCardHeader.vue): Module implementation.
- [`MapCardLeftPills.vue`](./MapCardLeftPills.vue): Module implementation.
- [`MapCardLockOverlay.vue`](./MapCardLockOverlay.vue): Module implementation.
- [`MapCardSpawns.vue`](./MapCardSpawns.vue): Module implementation.
- [`MapCardSpawnsTrigger.vue`](./MapCardSpawnsTrigger.vue): Module implementation.
- [`MapGrid.vue`](./MapGrid.vue): Module implementation.
- [`MapPokemonCenterBanner.vue`](./MapPokemonCenterBanner.vue): Module implementation.
- [`MapStatusSummary.vue`](./MapStatusSummary.vue): Module implementation.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Dynamic Multi-Slot Global Event Carousel & Viewport Sizing**: In `MapStatusSummary.vue`, the number of visible event banner slots ($K$) is computed dynamically based on container width and layout mode (Desktop vs Mobile/Tablet Stacked). When active events $N \le K$, all events are rendered statically in parallel (`.event-banners-grid`). When $N > K$, a multi-slot sliding carousel (`.event-carousel-viewport`) displaying $K$ banners simultaneously is activated to circulate all $N$ active events smoothly using GSAP, ensuring that every visible banner retains its individual `PVTooltip` and `@click` navigation. To prevent flexbox layout overflow where carousel viewports expand to 100% of the outer container and push the sibling Pokémon Center card off-screen, the events flex container (`.pc-right`) MUST enforce an explicit `max-width: calc(var(--visible-slots, 1) * 250px * var(--event-aspect, 1.7916) + (var(--visible-slots, 1) - 1) * 16px)` on desktop.

## Verification

- Run standard validation scripts.

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
