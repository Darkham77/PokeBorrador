# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Combat Grass & Emergence Layering**: Front combat grass (`CombatGrass layer="front"`) z-index layering MUST be controlled via reactive `:z-index` bindings using CSS `calc(var(--z-map-spawns) + X)` values (`+3` when covering, `+1` when behind). All intermediate FSM states between emergence jump start and active battle (such as `REORDER_TEAM`) MUST keep `bushIsBehind = true` to prevent z-index flicker during async worker initializations.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- [BattleArenaBushes.vue](./BattleArenaBushes.vue): Subcomponent for managing back/front combat grass layer rendering.
- [BattleArenaEnvironment.vue](./BattleArenaEnvironment.vue): Subcomponent for battle weather visuals and atmosphere filtering.
- [BattleArenaOverlayLayers.vue](./BattleArenaOverlayLayers.vue): Subcomponent for global transition overlays and screen fade layers.
- [BattleInfoCard.vue](./BattleInfoCard.vue): Active battle combatant status and team composition card.
- [BattleInfoCardHeader.vue](./BattleInfoCardHeader.vue): Subcomponent for combatant header name, gender, and caught status badge.
- [BattleInfoStats.vue](./BattleInfoStats.vue): Subcomponent for battle stat stage comparison grid.
- [MoveTooltip.vue](./MoveTooltip.vue): Move details dashboard and combat calculations tooltip.
- [MoveTooltipDetails.vue](./MoveTooltipDetails.vue): Subcomponent for turn order, speed matchup, and special mechanics.
- [MoveTooltipTactical.vue](./MoveTooltipTactical.vue): Subcomponent for tactical items, stat-modifying abilities, and tera forms.
