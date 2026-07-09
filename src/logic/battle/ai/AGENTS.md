# Purpose

Opponent AI battle logic. Selects moves, evaluates switches, and manages NPC item usage
during combat. Decoupled into three modules behind the `CombatAI` interface.

## Ownership

Battle Engine Developers.

## Local Contracts

- `getCombatAI()` (private to `battleAI.ts`) returns `ScriptedAI` when `window.__VITE_DEBUG__.mockEnemyChoices`
  is set, otherwise `StandardAI`. This is the only routing point — never instantiate AI classes directly outside this module.
- Scoring formulas in `StandardAI` must run synchronously and deterministically.
- `ScriptedAI` is E2E replay only — zero game logic, reads from `window.__VITE_DEBUG__`.

## Module Map

| File | Role |
|---|---|
| `combatAI.ts` | `CombatAI` interface (contract) |
| `standardAI.ts` | Real game AI with damage scoring, stat evaluation, item/switch heuristics |
| `scriptedAI.ts` | E2E mock AI that replays choices from `window.__VITE_DEBUG__.mockEnemyChoices` |
| `battleAI.ts` | Public facade — re-exports `decideEnemyMove`, `shouldEnemySwitch`, etc. |
