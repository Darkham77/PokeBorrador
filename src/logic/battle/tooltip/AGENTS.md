# Purpose

Manage move tooltip data formatting, secondary status effect parsing, and stage modifier details.

## Ownership

Frontend Developers / Battle Engine Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Move Tooltip Condition Builders**: `moveTooltipConditions.ts` encapsulates all status condition details (`TOOLTIP_CONDITION_DETAILS`), stage stat names (`TOOLTIP_STAGE_STAT_NAMES`), and boost calculations (`parseStatusEffectInfo`, `buildBoostInfo`, `buildConditionInfo`).
- **Zero Fallback & Typed Stats**: All stat conversions must strictly validate with `ShowdownBoostStatKey` and `TooltipStageStatId` without naked strings.

## Work Guidance

- Ensure pure calculations without side effects.

## Verification

- Run `npm run test` targeting `tests/unit/battle/move_tooltip_o1_lookup.spec.ts`.
