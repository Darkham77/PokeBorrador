# Purpose

Battle-related E2E tests verifying FSM synchronization, GSAP animations, held items effects, and weather system parity within the browser.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Playwright tests run turn-by-turn until the battle reaches absolute completion (over === true).
- Use local debug commands (`__VITE_DEBUG__`) to inject custom combat scenarios without map traversal.

## Work Guidance

- Ensure `fsm_sync.spec.ts` covers the batch movement/ability combinations.
- Write specific test cases for held items (`held_items.spec.ts`) and weather conditions (`weather.spec.ts`).

## Verification

- Run `npm run test:e2e:battle` to verify all battle tests.
- **Run specific simulation batches**: Prefer the native Playwright grep flag (`-g` or `--grep`) via `npm run`. This is clean, fully cross-platform, and avoids system environment variable syntax differences:
  - Run a specific batch: `npm run test:e2e:combat -- -g "lote #21"`
  - Alternatively, use the `TEST_BATCH` environment variable (for advanced ranges or multi-batch runs):
    - In PowerShell: `$env:TEST_BATCH="3"; npm run test:e2e:combat`
    - In Bash/Linux: `TEST_BATCH=3 npm run test:e2e:combat`
    - Supported formats: `"3"` (runs batch #3), `"1-5"` (runs batches 1 through 5), `"1,3,5"` (runs batches 1, 3, and 5).
