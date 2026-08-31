# tests/unit/components/

Unit tests for standalone Vue components.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test component mounting, props, events, and UI rendering under jsdom environment.
- Use strict TypeScript types for props and mock stores.
- Clean up any DOM side effects or global mocks after each test.
- `criminalityBar.spec.ts`: Unit tests for `CriminalityBar.vue` validating visibility by class/tab, style height calculation, reactive alert pulse at 100%, and excess label text formatting with extra level bonuses.

## Verification

- Run `npx vitest run tests/unit/components/` to execute component unit tests.

## Child DOX Index

- [home/](./home/AGENTS.md): Domain module documentation for home.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
