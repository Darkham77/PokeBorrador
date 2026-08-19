# Purpose

Manage the logic and assets of battle.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.
- **Typed Template Refs & Expose Helpers**: When extracting child SFC subcomponents that expose DOM elements via `defineExpose`, always expose typed helper methods (e.g., `getTrainerElement(): HTMLElement | null`) instead of performing double type assertions (`as unknown as HTMLElement`) in parent watchers.
- **Scoped SCSS in Battle Subcomponents**: All extracted battle UI subcomponents must explicitly link their scoped stylesheet (`src="@/styles/components/_battle-arena-view.scss"`) to share design tokens, GPU layers, and mixins without CSS duplication.
- **Combat Grass & Emergence Layering (Mandatory Relative Z-Index)**: Front combat grass (`CombatGrass layer="front"`), back bush (`.back-bush-entity`), and all battle combatants (`BattleCombatant`) MUST ALWAYS use relative z-index bindings using CSS `calc(var(--z-map-spawns) + X)` values (e.g. `calc(var(--z-map-spawns) - 5)` for back bush, `calc(var(--z-map-spawns) + 1)` for front bush when behind, `calc(var(--z-map-spawns) + 2)` for enemy Pokémon, `calc(var(--z-map-spawns) + 3)` for front bush when covering, and `calc(var(--z-map-spawns) + 4)` for player Pokémon). Hardcoding small literal numeric z-indexes (`:z-index="2"`, `:z-index="4"`) is STRICTLY FORBIDDEN because inline styles override CSS cascade rules and cause automatic fixes or refactors to place Pokémon behind environmental layers. All intermediate FSM states between emergence jump start and active battle (such as `REORDER_TEAM`) MUST keep `bushIsBehind = true` to prevent z-index flicker during async worker initializations.
- **Complete Animation Bridge Mapping**: Local component animation bridge objects (such as `localAnimations` in `BattleArenaView.vue`) MUST explicitly map and forward ALL methods exported by domain animation composables (including `handleWithdrawRequest`, `handleReleaseRequest`, and `handleCatchRequest`). Omitting exported methods causes consumer state handlers to evaluate animation requests to `undefined`, silently bypassing critical animation sequences.
- **Strict MoveTooltip Type Alignment**: MoveTooltip SFC subcomponents (`MoveTooltipDamage.vue`, `MoveTooltipStatsGrid.vue`, `MoveTooltipStatus.vue`) MUST import and use the derived `ActiveMoveDetails` type exported by `useMoveTooltip.ts` for their `activeDetails` prop, ensuring 1:1 parity with composable calculations and zero type mismatch warnings.
- **Snappy Battle Animation Timings**: In-combat hit reactions (`PLAY_DAMAGE` / `-damage`) MUST use dedicated combat damage shake durations (`0.25s`) without trailing capture rest intervals. Physical attack dashes MUST follow snappy timings (~0.36s total: 0.08s windup, 0.14s strike, 0.14s return) to guarantee responsive retro-modern combat pacing.

## Verification

- Run standard validation scripts (`npm test`).

## Child DOX Index

- [./helpers/AGENTS.md](./helpers/AGENTS.md): Visual battle animation helpers and GSAP bridges.
