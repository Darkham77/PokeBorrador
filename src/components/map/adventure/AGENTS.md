# src/components/map/adventure/ - GPS Adventure World Map Components

This directory contains the GPS-style Adventure World Map mode, interactive road navigation, modals, and pathfinding logic.

## Directory Scope & Responsibilities

- **`AdventureWorldMap.vue`**: Fullscreen modal/view rendering the Kanto region map with MapCards, GSAP camera panning/zooming, directional travel controls, wild encounter exploration integration, live HUD stacking, and real-time path traversal.
- **`AdventureInventoryModal.vue`**: Adventure backpack modal displaying unlocked field items (Bicycle, Cut, Surf, Fly, Flute, Badges) and companion follower selection.
- **`AdventureDebugModal.vue`**: QA & testing modal for cheat unlocking map nodes, MOs, and triggering swarms.
- **`useAdventureCapabilities.ts`**: Composable auditing player's active team moves (`cut`, `surf`, `fly`) and badges (`gameStore.state.badges`) to determine field capabilities and follower Pokémon.
- **`adventureMapData.ts`**: Static coordinate registry for Kanto cities, routes, water ways, POIs, farming ratings, and bidirectional connection graphs.
- **`adventurePathfinding.ts`**: Dijkstra shortest path and alternative path calculation algorithms respecting player MO unlocks.

## Key Architectural Rules

1. **Move-Based MO Unlocking**: MOs (Corte, Surf, Vuelo) require an active Pokémon in `gameStore.state.team` that actually knows that move, plus the corresponding gym badge.
2. **GSAP Exclusive Mandate**: All camera panning, zooming, and player movement along paths must be animated strictly via GSAP timelines.
3. **HUD Stacking & In-Game Immersion**: Center camera offsets and drawer padding must account for dynamic HUD height.
