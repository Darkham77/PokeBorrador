# AGENTS.md - Showdown Battle Engine

Contains the core single-path battle engine adapter (`showdownBattleEngine.ts`) wrapping `@pkmn/sim` for deterministic turn execution and cheat application.

## Governance & Rules
- `ShowdownBattleEngine` is the single source of truth for battle execution across fuzzer, replayer, and simulation modes.
- IPB healing cheats MUST be suppressed during `force-switch` turns to preserve Showdown choice validation.
- All switch choice failures MUST attempt move fallback slots before throwing explicit errors.
