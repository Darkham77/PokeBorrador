# Purpose

Manage the logic and assets of player.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- `identityCooldown.ts`: Shared logic and constants (`RENAME_COOLDOWN_DAYS = 30`) enforcing the unified identity cooldown across player profile, name changes, and gender selection in class management. All trainer identity changes must check `canChangeIdentity()` and atomically write `last_renamed_at` across `GameState`, `ProfileStore`, and local storage.
- `classMath.ts`: Pure mathematical formulas for player classes (Team Rocket, Bug Catcher, Trainer, Breeder). Police scaling functions (`calculatePoliceBonusLevel`, `calculatePoliceEffectiveLevel`, `calculatePoliceTeamSize`, `calculatePoliceBail`, `calculatePoliceEncounterChance`) MUST strictly clamp effective levels to `MAX_POKEMON_LEVEL` (100) to prevent engine crashes, legality failures in `@pkmn/sim`, and corrupt saves.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
