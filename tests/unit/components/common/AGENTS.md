# tests/unit/components/common/

Unit tests for common reusable UI components.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test component mounting, props, events, and UI rendering under jsdom environment.
- Use strict TypeScript types for props and mock stores.
- Clean up any DOM side effects or global mocks after each test.
- `BaseRefreshButton.spec.ts`: Unit tests for `BaseRefreshButton.vue` validating circular vector SVG rendering, size classes (`size-sm`, `size-md`), variant support (`variant="pill"`), GSAP rotation tween handling on `loading`, disabled state, and click event emissions.

## Verification

- Run `node --no-experimental-webstorage ./node_modules/vitest/vitest.mjs run tests/unit/components/common/` to execute common component unit tests.
