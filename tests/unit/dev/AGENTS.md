# Purpose

Unit tests and regression test suites for internal developer tools, editors, and catalog parsers.

## Ownership

Frontend Developers & Asset Pipeline Engineers.

## Local Contracts

- **Explicit JSDOM Directive**: All tests in this directory mounting Vue components (`mount`, `shallowMount`) or testing DOM interactions MUST declare `// @vitest-environment jsdom` at line 1.
- **Store & Pinia Isolation**: Each test suite must initialize and isolate a clean Pinia instance in `beforeEach(() => { setActivePinia(createPinia()) })`.
- **Zero Flakiness & Deterministic Tests**: Tests must avoid real timers and verify state reactively.

## Work Guidance

- Verify 1:1 behavioral parity between developer tools and combat components (`CombatShadow.vue`).
- Assert that shadow scales, feet points, and overrides are applied accurately.

## Verification

- `npm run test tests/unit/dev/shadow_editor.spec.ts`
