# AGENTS.md - BATTLE TESTER WORKSPACE CONTRACT

This directory contains the automated Battle Coverage Fuzzer for Gen 9 moves and abilities.

## Purpose

Simulate, test, and validate battle log synchronization between the Pokémon Showdown engine and the client-facing UI bridge (`showdownBridge`).

## Ownership

- **Owner**: QA / Core Engine Team
- **Responsibilities**: Maintenance of fuzzer execution, battle-agent logic, coverage generation, and ability scenarios.

## Local Contracts

- No runtime game-engine code is allowed here; this directory is strictly for utility and test automation.
- All files must be written in TypeScript and adhere to Node.js 26+ requirements (relative imports require explicit `.ts` extensions).
- The coverage report must be written to `scripts/battle-tester/results/coverage_report.json`.
- **Durable Progress Files Exception**: Durable progress tracking files (e.g. `results/sim_progress_YYYYMMDD.md`) generated during simulation runs are official, versioned assets of the fuzzer system and are exempt from the global `scratch/` mandate.
- **Uniform Enemy Team Design**: Wild battles and trainer battles MUST be initialized and treated uniformly. If no opponent team is provided during battle initialization, `enemyTeam` MUST be set to `[enemyPoke]`. Bypassing or omitting `enemyTeam` for wild encounters is forbidden to keep store logic clean and prevent desynchronizations.

## Work Guidance

- New complex moves or abilities that require initial state setups should be defined in `ability-scenarios.ts` rather than polluting `run-tester.ts` or the main database.
- Use Vue-reactive mocks from `mock-battle-store.ts` for all headless battle testing.

## Verification

Run coverage validation using:

```bash
npm run test:move-coverage
```

## Child DOX Index

- [fuzzer-ability-scenarios.ts](./fuzzer-ability-scenarios.ts): Custom initial combat setups and states for complex abilities.
- [fuzzer-agent.ts](./fuzzer-agent.ts): Headless combat decision agent for fuzzer simulation.
- [fuzzer-excluded-abilities.ts](./fuzzer-excluded-abilities.ts): List of abilities excluded from the automatic fuzzer testing.
- [fuzzer-vitest-bridge.ts](./fuzzer-vitest-bridge.ts): Vitest test-bridge helper that registers fuzzer suites in integration tests.
- [fuzzer-item-generator.ts](./fuzzer-item-generator.ts): Fuzzer helper that selects and attaches random items.
- [fuzzer-mock-battle-store.ts](./fuzzer-mock-battle-store.ts): Headless Pinia battle store mock.
- [fuzzer-engine.ts](./fuzzer-engine.ts): Main simulation engine executing fuzzer batches, tracking coverage, and saving logs.
- [fuzzer-team-generator.ts](./fuzzer-team-generator.ts): Generator for random fuzzer teams and sets.
- [fuzzer-run-tester.ts](./fuzzer-run-tester.ts): Reusable CLI diagnostic tool to run and trace specific fuzzer cases step-by-step.
