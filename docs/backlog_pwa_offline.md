# Technical Backlog: PWA Offline & Pixel-Art Sprite Pre-caching

This technical backlog documents the design, architecture, and requirements for implementing complete offline PWA playback and Pixel-Art Sprite Pre-caching in Poké Vicio.

---

## 1. Goal & Requirements

Provide a zero-network-latency, offline-capable experience for Poké Vicio by pre-caching static assets (sprites, audio, fonts) via a Service Worker and PWA Web App Manifest.

---

## 2. Architecture & Caching Strategy

### Service Worker Engine

- **Framework**: Workbox / Vite PWA (`vite-plugin-pwa`).
- **Scope**: Serves cached responses directly when offline or experiencing slow 3G network conditions.

### Cache Segregation

1. **Static Pixel-Art Sprites (`CacheFirst`)**:
   - Assets under `/assets/pokemon/`, `/assets/items/`, `/assets/ui/`, `/assets/audio/`.
   - Strategy: `CacheFirst` with a 30-day expiration policy. Serves from cache in 0ms without hitting the network.
2. **Dynamic Game APIs & Cloud Sync (`NetworkFirst`)**:
   - Requests to Supabase RPCs / GTS / Multiplayer APIs.
   - Strategy: `NetworkFirst` with graceful fallback to `DBRouter` local SQLite queue when offline.
3. **App Shell (`StaleWhileRevalidate`)**:
   - Main JS/CSS bundles and HTML entry point.
   - Strategy: `StaleWhileRevalidate` ensuring instant load while updating in the background.

---

## 3. Implementation Steps (Planned for Future Phase)

1. Add `vite-plugin-pwa` dependency to `package.json`.
2. Configure `vite.config.ts` with PWA Manifest (icons, theme colors, `display: "standalone"`).
3. Create `src/sw.ts` implementing Workbox precache routing.
4. Register Service Worker in `src/main.ts` with update toast notification.
5. Create unit and integration tests verifying offline route interception.
