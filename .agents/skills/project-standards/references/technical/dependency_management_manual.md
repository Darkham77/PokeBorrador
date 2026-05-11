# Dependency Management Manual

This manual defines the versioning policy and library stability for the Poké Vicio project.

## 🛡️ Core Stable Stack

To guarantee the operation of critical systems (PWA, Service Workers, Animations), the project adheres to a "Confirmed Stability Stack":

| Library | Version | Role |
| :--- | :--- | :--- |
| **Vite** | `^7.x` | Build Tool & Dev Server |
| **Vue** | `^3.5.x` | Framework Core |
| **Pinia** | `^2.x` | State Management |
| **Vue Router** | `^4.x` | Routing |
| **Vitest** | `^3.x` | Testing Framework |

### Why we don't use "Latest" (Vite 8+, Pinia 3+)

Even if newer versions exist, the plugin ecosystem (specifically `vite-plugin-pwa`) usually takes time to reach support parity. Using "bleeding edge" versions breaks the **Zero-Warning** policy and the integrity of the Service Worker on mobile devices.

---

## 🩹 Patches and Overrides

When critical vulnerabilities are detected in deep sub-dependencies that have not been updated by their maintainers, the project uses the `overrides` field in `package.tson`.

> [!IMPORTANT]
> **Current Build Patches**: All overrides (such as the one for `serialize-javascript`) are corrective measures for the current build and ecosystem state. They must be reviewed during every major version jump.

---

## 🚀 Guide for Future Migrations

Before attempting to upgrade any library in the "Core Stack", this protocol MUST be followed:

1. **Wave Analysis**: Do not update a single piece in isolation. Vite, Pinia, and Vue Router usually move in "waves". Verify that stable versions exist for all three before migrating any of them.
2. **Peer Dependencies Audit**: Explicitly verify that `vite-plugin-pwa` supports the new major version of Vite.
3. **SASS Mixin Validation**: Sass updates (e.g., towards 2.0) can break pixel-art mixins. Keep `sass` at versions that do not force massive color refactorings unless necessary.
4. **PWA Build Test**: A migration is only considered successful if `npm run build` generates a valid and functional `sw.ts`.

---

## 🛠️ Maintenance Commands

- **Verify Vulnerabilities**: `npm audit`
- **Clean Cache**: `npm cache clean --force`
- **Clean Reinstall**: `rm -rf node_modules package-lock.tson && npm install`

---

## 🛠️ Node.js 26+ & Browser Interoperability

To maintain a single codebase that runs in both Node.js (scripts/tests) and Browser (Vite), follow these standards:

1. **Vite Dynamic Import Ignoring**: When importing Node.js built-ins (`node:*`) dynamically within logic used by the frontend, ALWAYS use the `/* @vite-ignore */` comment.
   - **Example**: `const util = await import(/* @vite-ignore */ 'node:util');`
   - **WHY**: Prevents Vite from attempting to bundle or analyze server-only modules, avoiding build-time warnings and errors.
2. **Strict Sync Typing**: Avoid using `any` when synchronizing state with external APIs (like Supabase). Define explicit local interfaces for the expected response structure to maintain TypeScript integrity in `timeUtils.ts` and `DBRouter`.
3. **Temporal Mandate**: The legacy `Date` object is DEPRECATED for engine logic and timestamps. Use the `Temporal` API for all precise timing and durations in both logic and tests to ensure Node.js 26+ compatibility and clear automated audits.
4. **Node.js 26 Permission Model**: All maintenance/utility scripts MUST be compatible with the `--permission` flag. When performing network (fetch) or file (read/write) operations, ensure the user or the automated orchestrator can grant precise access (e.g., `--allow-net=archives.bulbagarden.net`, `--allow-fs-read=.`). Scripts must not assume unrestricted access to the system.
