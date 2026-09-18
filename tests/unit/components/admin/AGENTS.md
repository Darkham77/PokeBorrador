# tests/unit/components/admin/

Unit tests for admin and debug component helpers.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test debug helper utilities, mock teams, and battle anim/audio dispatching.
- Use strict TypeScript types and canonical domain IDs.
- Clean up any DOM side effects or global mocks after each test.
- `debugAudioAnimHelper.spec.ts`: Unit tests for `debugAudioAnimHelper.ts` evaluating status, secondary, field, and weather conditions.
- `debugTrainerTeamHelper.spec.ts`: Unit tests for `debugTrainerTeamHelper.ts` testing random debug team creation, level clamping, and probability distributions.

## Verification

- Run `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run tests/unit/components/admin/` to execute admin component unit tests.
