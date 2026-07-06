# AGENTS.md - BATTLE FUZZER WORKSPACE CONTRACT

This directory contains the automated Battle Coverage Fuzzer for Gen 9 moves, items and abilities.

## Purpose

Simulate, test, and validate battle log synchronization between the Pokémon Showdown engine and the client-facing UI bridge (`showdownBridge`) using headless simulation runs.

## Ownership

- **Owner**: QA / Core Engine Team
- **Responsibilities**: Maintenance of fuzzer execution, battle-agent logic, coverage generation, and ability scenarios.

## Local Contracts

- No runtime game-engine code is allowed here; this directory is strictly for utility and test automation.
- All files must be written in TypeScript and adhere to Node.js 26+ requirements (relative imports require explicit `.ts` extensions).
- The coverage report must be written to `scripts/e2e/results/fuzzer_moves_coverage_report.json`.
- **Durable Progress Files Exception**: Durable progress tracking files (e.g. `results/simulation_progress_log_YYYYMMDD.md`) generated during simulation runs are official, versioned assets of the fuzzer system.
- **Uniform Enemy Team Design**: Wild battles and trainer battles MUST be initialized and treated uniformly. If no opponent team is provided during battle initialization, `enemyTeam` MUST be set to `[enemyPoke]`. Bypassing or omitting `enemyTeam` for wild encounters is forbidden to keep store logic clean and prevent desynchronizations.

## Work Guidance

- New complex moves or abilities that require initial state setups should be defined in `scenarios/fuzzer_ability_scenarios.ts` rather than polluting runners or the main database.
- Use Vue-reactive mocks from `core/fuzzer_mock_battle_store.ts` for all headless battle testing.

## Verification

Run coverage validation using:

```bash
npm run sim:fuzzer
```

## Child DOX Index

- [core/](./core/): Main simulation engine, native fuzzer runner, agent decider, and mock stores.
- [generators/](./generators/): Random team and item generators for simulation batches.
- [scenarios/](./scenarios/): Combat setup scenarios for complex abilities and exclusion filters.
- [runners/](./runners/): Native Node.js execution scripts and diagnostic replayers.
