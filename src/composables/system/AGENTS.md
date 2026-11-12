# Purpose

Application session lifecycle helpers, route gates, gamepad input, and PWA service updates.

## Ownership

Core Infrastructure Team / Frontend Developers.

## Local Contracts

- **PWA Asset Cache Tiering & Selective Purge Protection (`usePWA.ts`, `vite.config.ts`)**:
  - PWA service worker caching is strictly partitioned into tiered buckets:
    1. **Code & Dynamic Chunks (`app-dynamic-chunks-v1`)**: Uses `StaleWhileRevalidate` and is purged on every client app update.
    2. **Dynamic UI Banners (`game-event-banners-v1`)**: Uses `StaleWhileRevalidate` for `/assets/ui/events/` and `/assets/ui/pokecenter/` to automatically download revised artwork in the background.
    3. **Static Game Assets (`game-images-v1`, `game-audio-v1`)**: Uses `CacheFirst` for 25,000+ sprites, items, and audio.
  - During client code updates, `purgeCodeCaches()` MUST preserve image and audio buckets matching `PRESERVED_CACHE_REGEXP = /^game-(images|audio|event-banners)-v\d+$/i` to avoid catastrophic bandwidth re-downloads on minor code releases.
- **Game History Trap & Secondary UI Back Dismissal (`appSessionHelper.ts`, `ModalDomController`)**:
  - Browser history traps (`pokevicioGuard: true`), mouse side-button blocking (`button === 3` / `button === 4`), keyboard history shortcut blocking (`Alt + ArrowLeft/Right`, `BrowserBack/Forward`, and `Backspace` outside editable inputs), and LIFO modal `Escape` / `popstate` dismissal are governed canonically by `@francogp/auditor/modals` (`ModalDomController`) mounted in `App.vue` via `useModalStore().mountDomController(...)`.
  - When `popstate` fires with no active modal in the stack, `dismissUnhandledSecondaryUi(uiStore)` in `appSessionHelper.ts` dismisses secondary non-modal UI layers in strict priority order (`isChatOpen` -> `isHistoryOpen` -> `openHudGroup`) without navigating away from the SPA.

## Key Files

- `appLoadingHelper.ts`: Module implementation.
- `appSessionHelper.ts`: Module implementation.
- `useAppRouteGate.ts`: Module implementation.
- `useRetroGamepad.ts`: Module implementation.
- [`usePWA.ts`](./usePWA.ts): Module implementation.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run standard type checks.

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
