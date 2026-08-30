# Purpose

Manage the logic and assets of map.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Dynamic Multi-Slot Global Event Carousel & Viewport Sizing**: In `MapStatusSummary.vue`, the number of visible event banner slots ($K$) is computed dynamically based on container width and layout mode (Desktop vs Mobile/Tablet Stacked). When active events $N \le K$, all events are rendered statically in parallel (`.event-banners-grid`). When $N > K$, a multi-slot sliding carousel (`.event-carousel-viewport`) displaying $K$ banners simultaneously is activated to circulate all $N$ active events smoothly using GSAP, ensuring that every visible banner retains its individual `PVTooltip` and `@click` navigation. To prevent flexbox layout overflow where carousel viewports expand to 100% of the outer container and push the sibling Pokémon Center card off-screen, the events flex container (`.pc-right`) MUST enforce an explicit `max-width: calc(var(--visible-slots, 1) * 250px * var(--event-aspect, 1.7916) + (var(--visible-slots, 1) - 1) * 16px)` on desktop.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
