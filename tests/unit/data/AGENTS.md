# Purpose

Unit tests for static data catalogs, domain dictionaries, and O(1) indexed lookup tables.

## Ownership

Game Data & Domain Architecture Team.

## Local Contracts

- Verify constant-time $O(1)$ lookup integrity across all static domain dictionaries (`ITEMS_BY_ID`, `NICK_STYLES_BY_ID`, `AVATAR_STYLES_BY_ID`, `CLASS_MISSIONS_BY_ID`, `RANKED_REWARD_MILESTONES_BY_ID`).
- Verify domain type guards (`isItemId`, `isNickStyleId`, `isAvatarStyleId`, `isMissionId`, `isRankedRewardMilestoneId`) and runtime validation boundaries without loose string casts.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
