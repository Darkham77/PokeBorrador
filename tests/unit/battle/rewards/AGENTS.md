# Purpose

Unit tests for battle rewards distribution, experience calculations, money multipliers, and NPC/Rival baby egg reward mechanisms.

## Work Guidance

- Verify reward calculations under different battle contexts (Wild, Trainer, Gym, PvP).
- Ensure drops conform strictly to drop rates, exclusions, and capacity constraints documented in `@/project-standards/references/systems/breeding_manual.md`.

## Test Index

- [battle_rewards_distribution_suite.spec.ts](./battle_rewards_distribution_suite.spec.ts): Cohesive domain suite consolidating battle rewards distribution (EXP, money, TMs, Gym badges) and NPC/Rival baby egg reward mechanisms (drop rates, Gym/PvP exclusions, incubator limits, full wild vigor).
