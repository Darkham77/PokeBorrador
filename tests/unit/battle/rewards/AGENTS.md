# Purpose

Unit tests for battle rewards distribution, experience calculations, money multipliers, and NPC/Rival baby egg reward mechanisms.

## Work Guidance

- Verify reward calculations under different battle contexts (Wild, Trainer, Gym, PvP).
- Ensure drops conform strictly to drop rates, exclusions, and capacity constraints documented in `@/project-standards/references/systems/breeding_manual.md`.

## Test Index

- [npc_baby_egg_rewards.spec.ts](./npc_baby_egg_rewards.spec.ts): Unit tests verifying NPC (2%) and Rival (5%) baby egg rewards, Gym/PvP exclusions, incubator slot limits (7 total, 1 NPC egg max), and full wild vigor (3-6).
