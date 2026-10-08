# Purpose

Native Node.js execution entry points, diagnostic tools, and pre-checks to run fuzzer suites.

## Ownership

QA / Core Engine Team.

## Local Contracts

- Execution must run under Node 26+ and utilize `--permission` flags.

## Key Files

- `ensure_fuzzer_cases.ts`: Module implementation.
- `fuzzer_case_replayer.ts`: Module implementation.
- `run_abilities_fuzzer.ts`: Module implementation.
- `run_ai_fuzzer.ts`: Module implementation.
- `run_all_fuzzers.ts`: Module implementation.
- `run_breeding_fuzzer.ts`: Module implementation.
- `run_gts_fuzzer.ts`: Module implementation.
- `run_gyms_fuzzer.ts`: Module implementation.
- `run_items_fuzzer.ts`: Module implementation.
- `run_missions_fuzzer.ts`: Module implementation.
- `run_moves_fuzzer.ts`: Module implementation.
- `run_scenarios_fuzzer.ts`: Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
