# tests/unit/components/

Unit tests for standalone Vue components.

## Ownership

Frontend Developers / QA Engineers.

## Local Contracts

- Test component mounting, props, events, and UI rendering under jsdom environment.
- Use strict TypeScript types for props and mock stores.
- Clean up any DOM side effects or global mocks after each test.
- `criminalityBar.spec.ts`: Unit tests for `CriminalityBar.vue` validating visibility by class/tab, style height calculation, reactive alert pulse at 100%, and excess label text formatting with extra level bonuses.
- `HUD_NavSocialGroup.spec.ts`: Unit tests for `HUD_NavSocialGroup.vue` asserting navigation toggle, presence of Amigos, Coliseo, and Dominancia buttons, notification badge counters, and strict elimination of legacy WorldEvents modal launcher.

## Verification

- Run `npx vitest run tests/unit/components/` to execute component unit tests.

## Child DOX Index

- [battle/](./battle/AGENTS.md): Domain module documentation for battle UI tests.
- [common/](./common/AGENTS.md): Domain module documentation for common reusable UI component tests.
- [events/](./events/AGENTS.md): Domain module documentation for event and mission component tests.
- [home/](./home/AGENTS.md): Domain module documentation for home.
- [modals/](./modals/AGENTS.md): Domain module documentation for modals.
- [pokemon-detail/](./pokemon-detail/AGENTS.md): Domain module documentation for pokemon-detail tabs tests.
