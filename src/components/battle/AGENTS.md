# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Combat Grass & Emergence Layering**: Front combat grass (`CombatGrass layer="front"`) z-index layering MUST be controlled via reactive `:z-index` bindings using CSS `calc(var(--z-map-spawns) + X)` values (`+3` when covering, `+1` when behind). All intermediate FSM states between emergence jump start and active battle (such as `REORDER_TEAM`) MUST keep `bushIsBehind = true` to prevent z-index flicker during async worker initializations.
- **Complete Animation Bridge Mapping**: Local component animation bridge objects (such as `localAnimations` in `BattleArenaView.vue`) MUST explicitly map and forward ALL methods exported by domain animation composables (including `handleWithdrawRequest`, `handleReleaseRequest`, and `handleCatchRequest`). Omitting exported methods causes consumer state handlers to evaluate animation requests to `undefined`, silently bypassing critical animation sequences.
- **Strict MoveTooltip Type Alignment**: MoveTooltip SFC subcomponents (`MoveTooltipDamage.vue`, `MoveTooltipStatsGrid.vue`, `MoveTooltipStatus.vue`) MUST import and use the derived `ActiveMoveDetails` type exported by `useMoveTooltip.ts` for their `activeDetails` prop, ensuring 1:1 parity with composable calculations and zero type mismatch warnings.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
