# Purpose

Canonical modal registry, static modal metadata, and `@francogp/auditor/modals` runtime adapters.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- **Single Canonical Modal Stack Engine (`modalEngine.ts`, `metadata.ts`)**: All hosted (`ModalHost.vue`) and standalone (`BaseModal.vue`, `DebugIllegalModal.vue`) modals run on `@francogp/auditor/modals` (`createModalStack`, `ModalAnimationController` with `createGsapModalDriver`, `ModalDomController`, and `Z_LAYERS` resolved via `resolveModalZLayers`). Duplicate custom z-index counters or ad-hoc modal stack arrays are strictly prohibited.
- **GSAP Timer Driver & History Trap**: Open/close fallback timeouts schedule via `gsap.delayedCall`, and browser/hardware back navigation binds through `createPokeVicioModalDomController` (`guardStateKey: 'pokevicioGuard'`).

## Key Files

- `metadata.ts`: Static modal policies (`singletonPolicy`, `dismissMode`, `obscuresBackground`, `isFullscreen`).
- `modalEngine.ts`: `@francogp/auditor/modals` runtime factory, GSAP motion resolver, and `ModalDomController` builder.
- `registry.ts`: Consolidated `MODAL_REGISTRY` catalog.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- [`./registries/AGENTS.md`](./registries/AGENTS.md): Subdomain modal registries.
