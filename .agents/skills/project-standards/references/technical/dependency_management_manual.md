# Dependency Management Manual

This manual defines the versioning policy and library stability for the Poké Vicio project.

## 🛡️ Core Stable Stack

To guarantee the operation of critical systems (PWA, Service Workers, Animations), the project adheres to a "Confirmed Stability Stack":

| Library | Version | Role |
| :--- | :--- | :--- |
| **Vite** | `^8.x` | Build Tool & Dev Server |
| **Vue** | `^3.5.x` | Framework Core |
| **Pinia** | `^2.x` | State Management |
| **Vue Router** | `^4.x` | Routing |
| **Vitest** | `^4.x` | Testing Framework |
| **TypeScript** | `^6.x` | Type Checker |

### Upgrade Policy

Before upgrading any Core Stack library, verify that `vite-plugin-pwa` supports the new Vite major (`npm info vite-plugin-pwa peerDependencies`). A migration is only successful if `npm run build` produces a functional `sw.js` and `npm run audit:full` passes with 0 errors.

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

## 🛠️ Environment Initialization & Workspace Update Mandate

Whenever asked to "actualiza el entorno de trabajo", "actualizar el entorno de trabajo", "actualizar herramientas", "update tools", "preparar entorno", "update workspace", or "instalar librerías / dependencias", the agent MUST execute the dedicated root setup script corresponding to the current operating system. This script automatically handles NVM verification/installation, Node.js runtime alignment (`engines.node`), global npm update (`npm install -g npm@latest`), global npm security settings, and deterministic project dependency installation via `npm ci`:

- **Linux / macOS**: `chmod +x ./setup-linux.sh && ./setup-linux.sh`
- **Windows (PowerShell as Administrator / Terminal)**: `PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1`

> [!TIP]
> **IDE / Terminal Restart Recommendation**: After executing the setup script or modifying environment variables/PATH, always restart the IDE or open a fresh terminal session so that all child process trees inherit the updated system PATH without requiring manual injections.

### 🛠️ Diagnostic & Maintenance Commands

- **Update Tools & Clean Dependencies (Single Command)**: `./setup-linux.sh` (Linux/macOS) / `.\setup-windows.ps1` (Windows)
- **Verify Build Tools**: `npm run validate:tools` (verifies and compiles native binary `css-checker-kit`)
- **Verify Vulnerabilities**: `npm audit`
- **Clean Cache**: `npm cache clean --force`
- **Clean Reinstall (Manual)**: `rm -rf node_modules package-lock.json && npm install`

---

## 🛠️ Node.js 26+ & Browser Interoperability

To maintain a single codebase that runs in both Node.js (scripts/tests) and Browser (Vite), follow these standards:

1. **Vite Dynamic Import Ignoring**: When importing Node.js built-ins (`node:*`) dynamically within logic used by the frontend, ALWAYS use the `/* @vite-ignore */` comment.
   - **Example**: `const util = await import(/* @vite-ignore */ 'node:util');`
   - **WHY**: Prevents Vite from attempting to bundle or analyze server-only modules, avoiding build-time warnings and errors.
2. **Strict Sync Typing**: Avoid using `any` when synchronizing state with external APIs (like Supabase). Define explicit local interfaces for the expected response structure to maintain TypeScript integrity in `timeUtils.ts` and `DBRouter`.
3. **Temporal Mandate**: The legacy `Date` object is DEPRECATED for engine logic and timestamps. Use the `Temporal` API for all precise timing and durations in both logic and tests to ensure Node.js 26+ compatibility and clear automated audits.
   - **Native-First Architecture**: Follow a "Native-First" approach by loading the `@js-temporal/polyfill` conditionally via `src/logic/utils/temporal-init.ts`. Global types MUST be provided via `tsconfig.json` (types array) and `src/types/env.d.ts` (global augmentation) instead of local imports to prevent namespace conflicts between native and polyfill types. Avoid importing `{ Temporal }` locally in Vue SFCs or normal utility modules.
   - **Temporal API Comparison & Coercion**: When comparing `Temporal` objects, use the static compare method `Temporal.Instant.compare(now, range.start) >= 0` instead of native operators like `>=`. When coercing to strings, use `${obj}` or `String(obj)`. When coercing to numbers, use properties/methods of the object, not `+obj`. When concatenating, use `${str}${obj}` or `str.concat(obj)`. In templates, coerce to a string before rendering.
   - **BigInt Precision**: When performing calculations with nanosecond precision (`epochNanoseconds`), ALWAYS use explicit `BigInt()` casts (e.g., `BigInt(instant.epochNanoseconds)`) to ensure consistency across all IDEs and TypeScript environments.
   - **Atomicity**: To prevent time inconsistencies (clock skew/race conditions) and unnecessary system calls/allocations when chaining time formatting, always capture a single Temporal instance in a constant (e.g., `const now = Temporal.Now.instant().toZonedDateTimeISO('UTC')`) and perform subsequent calculations/formatting on that single instance.
4. **Node.js 26 Permission Model**: All maintenance/utility scripts MUST be compatible with the `--permission` flag. When performing network (fetch) or file (read/write) operations, ensure the user or the automated orchestrator can grant precise access (e.g., `--allow-net=archives.bulbagarden.net`, `--allow-fs-read=.`). Scripts must not assume unrestricted access to the system.
5. **Pure Node.js ESM Relative Import Extension**: In pure Node.js 26+ ESM execution mode (`--experimental-strip-types`), relative imports within TypeScript files MUST explicitly include the `.ts` extension (e.g., `import { mulberry32 } from '../utils/math.ts';`) to avoid `ERR_MODULE_NOT_FOUND` during native test runner execution (`node:test`). This rule applies to test suites (such as Vitest files `*.spec.ts`) importing helpers or logic files to ensure a zero-warning audit and test execution path.
6. **Cache-First Pattern for Permission Model Scripts**: Scripts running under `--permission` that use a local cache directory (e.g., `scripts/.cache/`) MUST check for cache file existence (`fs.access`) *before* attempting `fs.mkdir` on the parent directory. When `--allow-fs-write` is not granted, `fs.mkdir` throws even with `{ recursive: true }` on an existing directory. Checking the cache first allows read-only execution to succeed when the cache is already populated.
7. **Vite Config Top-Level Code Trap**: Any code written at the **module top level** of `vite.config.ts` (outside of plugin hooks) is executed on **every** Vite invocation — including `npm run dev`, `npm run test`, and `npm run build`. This means top-level `fs.writeFileSync()` calls will silently overwrite production build artifacts (e.g., `public/version.json`) every time the dev server starts, corrupting the canonical build version that server-update scripts depend on. File-writing operations that belong exclusively to the build output MUST be placed inside a Vite plugin's `buildStart()` hook, which only runs during `npm run build`:

   ```typescript
   // ✅ Correct: only runs during `npm run build`
   function versionPlugin() {
     return {
       name: 'version-json-writer',
       buildStart() { fs.writeFileSync('public/version.json', ...); }
     }
   }
   // ❌ Wrong: runs on dev, test, and build — overwrites build output
   fs.writeFileSync('public/version.json', ...);
   ```
