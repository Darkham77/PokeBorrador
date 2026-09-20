# tests/unit/components/helpers/

Unit test suites for Vue component helper modules, utilities, and UI layout composables.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test pure UI helpers, layout positioners, modal position rules, and visual formatters under jsdom environment.
- Strict assertions against boundary conditions (e.g. large screen thresholds, responsive bounds).
- `battle_and_map_helpers_suite.spec.ts`: Unit tests for battle action and map UI helper functions.
- `modal_helpers_suite.spec.ts`: Unit tests for modal positioning, animation offsets, and large screen layout rules (`baseModalHelper.ts`).
- `pokemon_and_profile_helpers_suite.spec.ts`: Unit tests for Pokémon detail view and trainer profile helpers.
- `social_helpers_suite.spec.ts`: Unit tests for chat, friend list, and social UI component helpers.

## Verification

- Run `npm run test:unit -- tests/unit/components/helpers/` to execute helper test suites.
