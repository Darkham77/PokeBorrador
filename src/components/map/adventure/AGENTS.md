# src/components/map/adventure/ - GPS Adventure World Map Components

This directory contains the GPS-style Adventure World Map draft mode, interactive road navigation, modals, and pathfinding logic.

## Directory Scope & Responsibilities

- **`AdventureWorldMap.vue`**: Fullscreen modal/draft mode view rendering the Kanto region map with double-layered SVG routes, smooth GSAP camera panning/zooming, directional travel controls, wild encounter exploration integration, and live HUD stacking.
- **`AdventureInventoryModal.vue`**: Adventure backpack modal displaying unlocked field items (Bicycle, Cut, Surf, Fly, Flute, Badges) and companion follower selection.
- **`AdventureDebugModal.vue`**: QA & testing modal for cheat unlocking map nodes, MOs, and triggering swarms.
- **`adventureMapData.ts`**: Static coordinate registry for Kanto cities, routes, water ways, POIs, farming ratings, and bidirectional connection graphs.
- **`adventurePathfinding.ts`**: Dijkstra shortest path and alternative path calculation algorithms respecting player MO unlocks and discovered regions.

## Key Architectural Rules

1. **Retro-Modern Visual Compliance**: Always maintain pixelated sprite scaling, custom HUD stacking with `var(--hud-top-padding)`, and GSAP-exclusive animations.
2. **Deterministic Route Traversal**: Player sprite transitions must dynamically switch sprites (`up`, `down`, `left`, `right`, `surf`, `bike`, `fly`) matching the exact travel vector of each route leg.
3. **Canonical Combat Integration**: Zone exploration (`exploreZone`) must strictly delegate to `mapStore.navigate(routeId)` to generate standard encounters without dynamic schema fallbacks.
4. **Explicit SVG World Dimensions**: All map road lines and GPS preview paths in world containers (`3600px x 4600px`) must define explicit CSS dimensions, `pointer-events: none;`, `stroke-linejoin: round;`, and explicit `z-index` layering.
5. **HUD Stacking & Padding Synchronization**: Avoid `<Teleport to="body">` for in-game immersive map view modes so the top trainer HUD and bottom navigation bar remain interactable; center camera offsets must account for dynamic HUD height (`var(--hud-top-padding)`).
