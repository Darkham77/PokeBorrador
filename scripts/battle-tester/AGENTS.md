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

## Work Guidance

- New complex moves or abilities that require initial state setups should be defined in `ability-scenarios.ts` rather than polluting `run-tester.ts` or the main database.
- Use Vue-reactive mocks from `mock-battle-store.ts` for all headless battle testing.

## Verification

Run coverage validation using:

```bash
npm run test:move-coverage
```

## Child DOX Index

None.
