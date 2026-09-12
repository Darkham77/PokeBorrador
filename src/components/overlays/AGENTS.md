# Purpose

Manage the logic and assets of overlays.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Contextual Overlays Visibility**: Global floating overlays tied to world exploration or active timers (such as `BuffsOverlay.vue`) MUST strictly condition their visibility to the home and map tabs (`activeTab === 'map' || activeTab === 'home'`). When the user switches to other full views (PC Box, Pokédex, Bag, Gyms), these overlays must be hidden to prevent obstructing headers, tabs, search inputs, or management controls.
- **Explicit Cross-Axis Alignment for Tooltip Lists**: Any vertical overlay list rendering badges, chips, or timers wrapped in tooltip containers (`PVTooltip`) MUST explicitly specify `align-items: flex-start;`. Because `.pv-tooltip-wrapper` applies `justify-content: center !important;`, omitting `align-items` defaults to `stretch`, causing shorter badges to be horizontally centered inside the expanded wrapper rather than aligned flush to the left boundary.
- **Zero Redundancy in Deployment Badges & Tooltips**: In floating countdown badges (such as class mission deployments in `BuffsOverlay.vue`), tooltips MUST NEVER repeat the countdown timer or remaining duration already prominently visible in the badge's numeric display. The tooltip description MUST instead describe the mission's core rules, costs, class requirements, and reward conditions (`details.rulesText`). When completed, it must transition to the collection prompt (`"¡Operación finalizada! Haz clic para cobrar el botín."`).

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- Use `useUIStore().activeTab === 'map'` to guard floating overlays and verify with unit tests that overlay elements do not render or intercept pointer events when navigating across secondary game tabs.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
