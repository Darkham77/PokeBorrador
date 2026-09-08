# Purpose

Manage unified reward aggregation, notification counts, and multi-source reward claiming logic.

## Ownership

Frontend Developers / Core Gameplay Engineers.

## Local Contracts

- **Unified Aggregation**: All reward sources across the game (tournaments, ranked arena milestones, class missions, GTS/trades) must be aggregated reactively through `useUnifiedRewards`.
- **Zero Duplication**: Components must consume the centralized composable rather than querying domain stores independently for claimable loot.

## Work Guidance

- Ensure reactive counts update automatically when domain store states change.
- Individual and bulk claim handlers must delegate to their corresponding canonical domain stores without mutating external states directly.

## Verification

- Run `npm run test:unit tests/unit/composables/useUnifiedRewards.test.ts` to verify reward aggregation and store delegation.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
