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
- **History Terna Contract**: All battle history entries in `fuzzer_certified_cases.json` MUST use the unified terna structure `{ turnCount, p1Choice, p2Choice, battleTurn, p1Heal?, p2Heal? }`. Separate `cheats` arrays or detached index mappings are strictly prohibited.
- **Mandatory Clean Artifact Wipe Contract**: Before running `sim:fuzzer`, `ensure_fuzzer_cases.ts` MUST perform a clean wipe of all previous fuzzer-generated artifacts (`fuzzer_*.json`, `fuzzer_*.txt`, `fuzzer_certified_cases.json`) in `scripts/e2e/results/` to guarantee fresh generation from scratch by default.
- **Single-Writer Sequential File Queue Contract**: Direct calls to `fs.writeFile` for outputting coverage reports or certified cases are strictly forbidden. All write operations MUST be delegated to `fileWriterQueue.safeWriteFile` to eliminate disk write race conditions and lock contention.
- **In-Memory Storage & Single Atomic FileWriter Queue Flush Contract**: Fuzzer test cases MUST be accumulated in memory during execution via `fuzzerMemoryStore` rather than performing iterative disk writes. The final `fuzzer_certified_cases.json` file is written atomically upon suite completion using `fileWriterQueue.safeWriteFile`.
- **Multi-Process Worker Threads Concurrency Contract**: Parallel fuzzer execution MUST utilize native Node.js Worker threads (`worker_threads`) via `fuzzer_batch_worker.ts`. The worker count MUST be dynamic: `Math.max(1, Math.floor(os.cpus().length / 4))` (i.e., total logical cores divided by 4, representing physical cores / 2, to optimize throughput and keep the system responsive). It is STRICTLY FORBIDDEN to hardcode a fixed worker count. Playwright also uses the same formula (`Math.max(1, Math.floor(os.cpus().length / 4))`) defined in `playwright.config.ts`.
- **Natural Battle Execution & Temporary Cheats Deactivation Contract**: Fuzzer battle execution MUST operate in two mandatory sequential phases within each battle:
  1. **Phase 1 (Cheat-Assisted Testing)**: While there are untested moves/abilities remaining in the batch (`hasUntestedItemsAfterTurn === true`), apply Infinite Punching Bag (IPB) healing cheats when HP drops to critical levels.
  2. **Phase 2 (Natural Unassisted Combat Completion)**: As soon as all moves/abilities in the batch have been certified (`hasUntestedItemsAfterTurn === false`), IPB cheats MUST be completely deactivated. The battle MUST continue executing naturally turn-by-turn until the battle ends organically (`simBattle.ended === true`). It is STRICTLY FORBIDDEN to introduce artificial loop breaks, early returns, or synthetic truncations when testing finishes. Battles must always complete naturally to generate a clean, un-truncated choice stream for Playwright E2E replays.

## Work Guidance

- New complex moves or abilities that require initial state setups should be defined in `scenarios/fuzzer_ability_scenarios.ts` rather than polluting runners or the main database.
- Use Vue-reactive mocks from `core/fuzzer_mock_battle_store.ts` for all headless battle testing.

## Verification

Run coverage validation using:

```bash
npm run sim:fuzzer
```

## Child DOX Index

- [core/](./core/AGENTS.md): Domain module documentation for core.
- [generators/](./generators/AGENTS.md): Domain module documentation for generators.
- [runners/](./runners/AGENTS.md): Domain module documentation for runners.
- [scenarios/](./scenarios/AGENTS.md): Domain module documentation for scenarios.
- [tools/](./tools/AGENTS.md): Domain module documentation for tools.
