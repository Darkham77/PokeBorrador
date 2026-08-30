# Purpose

Manage the logic and assets of overlays.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Map-Exclusive Visibility for Contextual Overlays**: Global floating overlays tied to world exploration or active timers (such as `BuffsOverlay.vue`) MUST strictly condition their visibility to the map tab (`activeTab === 'map'`). When the user switches to other full views (PC Box, Pokédex, Bag, Gyms), these overlays must be hidden to prevent obstructing headers, tabs, search inputs, or management controls.
- **Explicit Cross-Axis Alignment for Tooltip Lists**: Any vertical overlay list rendering badges, chips, or timers wrapped in tooltip containers (`PVTooltip`) MUST explicitly specify `align-items: flex-start;`. Because `.pv-tooltip-wrapper` applies `justify-content: center !important;`, omitting `align-items` defaults to `stretch`, causing shorter badges to be horizontally centered inside the expanded wrapper rather than aligned flush to the left boundary.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- Use `useUIStore().activeTab === 'map'` to guard floating overlays and verify with unit tests that overlay elements do not render or intercept pointer events when navigating across secondary game tabs.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
