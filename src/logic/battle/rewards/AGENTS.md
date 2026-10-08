# Purpose

This directory contains modular reward processors and handlers executed at the conclusion of battle or upon combat milestones.

## Ownership

Poké Vicio Development Team.

## Local Contracts

### Local Governance & Rules

- All reward calculations must remain deterministic and zero-timer compliant.
- Use `gsapSleep` for any modal pauses during evolution or move learning sequences.
- Reward formulas must adhere to the central formulas documented in `game_formulas_manual.md`.

## Key Files

- [gymRewardsHandler.ts](./gymRewardsHandler.ts): Handles first-time gym badges, TM rewards, rematch item drop probabilities, and difficulty-based bulk EXP/money awards.
- [combatantExpEvProcessor.ts](./combatantExpEvProcessor.ts): Processes EXP and EV gains per combatant, Pokérus transmission, level-up notifications, move learning queues, and level-up evolution checks.
- [classRewardsHandler.ts](./classRewardsHandler.ts): Processes Rival item drops, Team Rocket route extortion bonuses, Trainer official route reputation increments, and Battle Coins / Trainer EXP scaling.
- [npcEggRewardsHandler.ts](./npcEggRewardsHandler.ts): Processes baby Pokémon egg rewards (`isNpc: true`) given by normal NPC trainers (2%) and Rivals (5%), excluding Gyms and PvP battles.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
