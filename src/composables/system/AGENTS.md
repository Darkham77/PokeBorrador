# Purpose

Native back navigation helpers and PWA service updates.

## Ownership

Core Infrastructure Team / Frontend Developers.

## Local Contracts

- **PWA Asset Cache Tiering & Selective Purge Protection (`usePWA.ts`, `vite.config.ts`)**:
  - PWA service worker caching is strictly partitioned into tiered buckets:
    1. **Code & Dynamic Chunks (`app-dynamic-chunks-v1`)**: Uses `StaleWhileRevalidate` and is purged on every client app update.
    2. **Dynamic UI Banners (`game-event-banners-v1`)**: Uses `StaleWhileRevalidate` for `/assets/ui/events/` and `/assets/ui/pokecenter/` to automatically download revised artwork in the background.
    3. **Static Game Assets (`game-images-v1`, `game-audio-v1`)**: Uses `CacheFirst` for 25,000+ sprites, items, and audio.
  - During client code updates, `purgeCodeCaches()` MUST preserve image and audio buckets matching `PRESERVED_CACHE_REGEXP = /^game-(images|audio|event-banners)-v\d+$/i` to avoid catastrophic bandwidth re-downloads on minor code releases.
- **Game History Trap & Navigation Interception Mandate (`useBackNavigation`)**:
  - Web game single-page applications MUST prevent all browser history navigation exits on desktop and mobile.
  - `useBackNavigation` establishes a permanent state guard (`pokevicioGuard: true`) in `window.history.pushState` upon initial mount and re-pushes it immediately whenever a `popstate` event is triggered.
  - Hardware mouse navigation buttons (`button === 3` Back, `button === 4` Forward) on `mousedown`, `mouseup`, `auxclick`, `pointerdown`, and `pointerup` MUST be intercepted with `preventDefault()` and `stopImmediatePropagation()`.
  - Browser navigation keyboard shortcuts (`Alt + ArrowLeft/Right`, `BrowserBack/Forward`, and `Backspace` outside `<input>`, `<textarea>`, or `contenteditable` elements) MUST be intercepted with `preventDefault()`.
  - When `popstate` is received, open UI layers (modals, chat, history, hud groups) are dismissed gracefully as an in-game back action without allowing the browser to navigate away from the game view.

## Verification

- Run standard type checks.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
