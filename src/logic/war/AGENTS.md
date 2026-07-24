# Purpose

Manage the logic and assets of war.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Weekly Dominance Settlement**: Weekly settlement of map dominance (`war_dominance`) MUST be executed via a dedicated Supabase SQL/RPC procedure rather than inline client aggregation.
- **Weekly Rewards Scale**: Weekly War Coins milestone rewards use the standard scale: 1 PT -> 10 coins, 101 PT -> 35 coins, 501 PT -> 75 coins, 1501 PT -> 150 coins, plus +50 coins for winning faction bonus.
- **Guardian Spawn Chance**: Base encounter chance for Guardians on conflict zone maps is strictly fixed at 1.5% (`GUARDIAN_CHANCE = 0.015`).
- **Daily Conflict Zones**: Exactly 12 deterministic conflict zone maps are active per day in Kanto (`getConflictZones`).

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
