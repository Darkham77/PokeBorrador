# Purpose

Native Node.js execution entry points, diagnostic tools, and pre-checks to run fuzzer suites.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Execution must run under Node 26+ and utilize `--permission` flags.

## Key Files

- [`ensure_fuzzer_cases.ts`](./ensure_fuzzer_cases.ts): Ensures certified cases are generated, wiping stale artifacts before execution (`npm run sim:fuzzer`).
- [`fuzzer_case_replayer.ts`](./fuzzer_case_replayer.ts): Fast headless case replayer in pure Node.js (`npm run sim:fuzzer:trace [<caseId> | case=<caseId>]`).
- [`run_abilities_fuzzer.ts`](./run_abilities_fuzzer.ts): Headless fuzzer runner for Pokémon battle abilities.
- [`run_ai_fuzzer.ts`](./run_ai_fuzzer.ts): Headless fuzzer runner for heuristic battle AI decisions.
- [`run_all_fuzzers.ts`](./run_all_fuzzers.ts): Master fuzzer runner orchestrating all sub-fuzzers concurrently.
- [`run_breeding_fuzzer.ts`](./run_breeding_fuzzer.ts): Headless fuzzer runner for Pokémon breeding mechanics and daycare cycles.
- [`run_gts_fuzzer.ts`](./run_gts_fuzzer.ts): Headless fuzzer runner for GTS market transactions and trade offers.
- [`run_gyms_fuzzer.ts`](./run_gyms_fuzzer.ts): Headless fuzzer runner for gym progression and leader combats.
- [`run_items_fuzzer.ts`](./run_items_fuzzer.ts): Headless fuzzer runner for held battle items and item effects.
- [`run_missions_fuzzer.ts`](./run_missions_fuzzer.ts): Headless fuzzer runner for daily and story mission objectives.
- [`run_moves_fuzzer.ts`](./run_moves_fuzzer.ts): Headless fuzzer runner for Gen 9 moves and mechanics.
- [`run_scenarios_fuzzer.ts`](./run_scenarios_fuzzer.ts): Headless fuzzer runner for tactical combat scenarios.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
