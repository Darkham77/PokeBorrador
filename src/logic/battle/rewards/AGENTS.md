# src/logic/battle/rewards/AGENTS.md

## Purpose & Scope

This directory contains modular reward processors and handlers executed at the conclusion of battle or upon combat milestones.

## Directory Structure & Files

- [gymRewardsHandler.ts](./gymRewardsHandler.ts): Handles first-time gym badges, TM rewards, rematch item drop probabilities, and difficulty-based bulk EXP/money awards.
- [combatantExpEvProcessor.ts](./combatantExpEvProcessor.ts): Processes EXP and EV gains per combatant, Pokérus transmission, level-up notifications, move learning queues, and level-up evolution checks.
- [classRewardsHandler.ts](./classRewardsHandler.ts): Processes Rival item drops, Team Rocket route extortion bonuses, Trainer official route reputation increments, and Battle Coins / Trainer EXP scaling.

## Local Governance & Rules

- All reward calculations must remain deterministic and zero-timer compliant.
- Use `gsapSleep` for any modal pauses during evolution or move learning sequences.
- Reward formulas must adhere to the central formulas documented in `game_formulas_manual.md`.
