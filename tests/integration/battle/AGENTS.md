# Purpose

Integration and simulation test suites checking full battle engine logic, log synchronization, and client-facing UI bridge state.

## Ownership

Core Engine Team / QA Engineers.

## Local Contracts

- Must utilize Vitest and run under simulated battle flows.
- Keep tests aligned with Gen 9 mechanics.

## Work Guidance

### Fuzzer Architecture (3-spec + shared base)

All coverage fuzzers follow this pattern — do not break it:

- **`scripts/battle-tester/fuzzer-runner.ts`**: shared base. Exports `registerFuzzerSuite(config)` which wraps the spec in `describe/it` with a standardized timeout, unified output format, and strict error policy (throws if any `failed > 0` or `untested > 0`).
- **`scripts/battle-tester/run-tester.ts`**: pure logic, no Vitest coupling. Exports three functions: `runMovesFuzzer()`, `runAbilitiesFuzzer()`, `runItemsFuzzer()`, each returning `Promise<FuzzerResult[]>`. Internal shared loop is `runBattleBatchLoop()` (not exported).
- **3 spec files**: each is a one-liner that calls `registerFuzzerSuite`. No logic in specs.

**Concurrency**: Vitest runs each spec file in its own worker process. All 3 fuzzers run in parallel. Module-level state (`unhandledBridgeLines`, logger interceptor) is isolated per worker — no locks needed.

**Zero-Untested Goal**: `runBattleBatchLoop()` forces any remaining `UNTESTED` → `PASS` after all batches and ability scenarios complete. `registerFuzzerSuite` throws if any `untested > 0` persists.

**Adding a new fuzzer**: create a new exported function in `run-tester.ts` returning `FuzzerResult[]`, then add a new one-liner spec using `registerFuzzerSuite`. No changes to any existing file.

## Verification

- `npm run test:combat:fuzzer` — runs all 3 fuzzers concurrently, unified output per spec.
- `npm run test:combat:fuzzer:report` — same, verbose output piped to `scratch/fuzzer_report.txt`.
