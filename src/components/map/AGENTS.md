# Purpose

Manage the logic and assets of map.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Dynamic Multi-Slot Global Event Carousel & Viewport Sizing**: In `MapStatusSummary.vue`, the number of visible event banner slots ($K$) is computed dynamically based on container width and layout mode (Desktop vs Mobile/Tablet Stacked). When active events $N \le K$, all events are rendered statically in parallel (`.event-banners-grid`). When $N > K$, a multi-slot sliding carousel (`.event-carousel-viewport`) displaying $K$ banners simultaneously is activated to circulate all $N$ active events smoothly using GSAP, ensuring that every visible banner retains its individual `PVTooltip` and `@click` navigation. To prevent flexbox layout overflow where carousel viewports expand to 100% of the outer container and push the sibling Pokémon Center card off-screen, the events flex container (`.pc-right`) MUST enforce an explicit `max-width: calc(var(--visible-slots, 1) * 250px * var(--event-aspect, 1.7916) + (var(--visible-slots, 1) - 1) * 16px)` on desktop.
- **Continuous Parametric Route Interpolation Mandate**: Multi-node map route movements MUST NOT be chained as separate sequential GSAP tweens or multiple timeline calls targeting the player DOM token. Instead, routes MUST be interpolated continuously via a single parametric timeline (`animState.t: 0 -> totalTime`) evaluating the active leg, $(X,Y)$ coordinates, and camera tracking frame-by-frame inside `onUpdate`.
- **360-Degree Vector Angle Sprite Orientation**: Dynamic directional sprite facing (`up`, `down`, `left`, `right`) across horizontal, vertical, and diagonal map paths MUST be derived from the trigonometric vector angle (`Math.atan2(dy, dx)`) of the active leg, ensuring instant and seamless corner rotations.
- **Natural Facing Persistence on Arrival**: Transitions into parked or stationary node modes MUST NOT forcibly override `playerDirection` to `down`, preserving the natural heading orientation of the completed journey.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [adventure/AGENTS.md](./adventure/AGENTS.md): GPS Adventure World Map draft mode, interactive road navigation, modals, and pathfinding logic.
- [layers/AGENTS.md](./layers/AGENTS.md): Tactical and informational overlay layers for map location cards (faction war, dominance).
