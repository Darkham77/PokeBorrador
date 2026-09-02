# Purpose

Web worker threads and background offscreen processing for heavy serialization, persistence, and compute tasks.

## Ownership

Logic Developers / Core Infrastructure Team.

## Local Contracts

- **Thread-safe Worker Communication**: All worker communications must use structured messaging and typed payload interfaces.
- **Off-Thread Save Processing (`save.worker.ts`, `saveWorkerClient.ts`)**: Game state serialization and sanitization must execute inside background workers to prevent blocking the main UI thread during autosaves.
- **Worker Chunking & Rollup Modularization Mandate**: When building Web Workers with ES module format (`{ type: 'module' }`), heavy shared dependencies (such as `@pkmn/sim` and large static data modules) MUST be partitioned via `worker.rollupOptions.output.manualChunks` in `vite.config.ts`. This eliminates duplicate 8MB+ monolithic worker bundles, minimizes browser AST parse time, enables cross-worker chunk reuse, and strictly protects PWA Workbox cache limits (< 8 MB).

## Work Guidance

- Avoid importing DOM APIs, Vue reactives, or Pinia stores inside worker files.
- Always cleanly terminate or pool workers when destroyed.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
