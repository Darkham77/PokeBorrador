# tests/unit/composables/

Unit tests for Vue composition functions and reactive composable helpers.

## Ownership

Frontend Developers / State Architects.

## Local Contracts

- Test reactive helpers, box filter predicates, and UI state composables under jsdom.
- `test_box_filter_predicates.spec.ts`: Unit tests verifying pure predicates for IV/EV/tags/friendship box filtering.
- `composable_helpers_suite.spec.ts`: Unit tests verifying pure helpers, date parsing, schedule window formatting, category icons, and sub-competition metric titles.

## Verification

- Run `npm run test` to verify composable unit tests.
