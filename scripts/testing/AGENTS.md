# Purpose

Test execution orchestration, multi-platform Docker container lifecycle, PostgreSQL ephemeral testing environments, and dual-engine test runners.

## Ownership

DevOps / QA Engineers.

## Local Contracts

- **Multi-Platform Docker Auto-Discovery**: The test orchestrator (`run_tests.ts`) dynamically detects `docker` binaries across Windows (`where.exe`, `%LOCALAPPDATA%`, `%ProgramFiles%`), Linux (`which`, `/usr/bin/docker`, `/snap/bin/docker`), and macOS (`/opt/homebrew/bin/docker`).
- **Daemon Auto-Start**: If Docker CLI is found but the daemon is inactive, the orchestrator automatically attempts to launch the Docker service (`Docker Desktop.exe` / `systemctl` / `open -a Docker`) with graceful polling and fallback.
- **Ephemeral PostgreSQL Container Lifecycle**: Starts `postgres:15-alpine` on port 54329 with in-memory RAM disk (`--tmpfs /var/lib/postgresql/data:rw`), applies baseline schema and migration patches, and performs guaranteed teardown on process exit (`SIGINT`, `SIGTERM`, `exit`).
- **Dual-Engine Execution**: When Docker PostgreSQL is active, database-enabled tests run against both SQLite (in-memory) and PostgreSQL (ephemeral container). When Docker is missing, tests gracefully fallback to SQLite in RAM and display a clear summary warning.
- **Subprocess PATH Prepending**: When launching Docker CLI, the orchestrator MUST prepend the resolved binary directory (`path.dirname(dockerBin)`) to `process.env.PATH` to ensure sibling helper binaries (`docker-credential-desktop`) are immediately discoverable.
- **Node.js 26 Permission Addon Mandate**: Test orchestrators launching Vitest under Node 26 sandboxed permissions MUST declare `--allow-addons` to permit Rolldown platform-specific native addons (`.node`) alongside `--allow-child-process` and `--allow-net`.

## Key Files

- [`run_tests.ts`](./run_tests.ts): Test orchestrator managing Docker detection, container lifecycle, SQL migrations, and Vitest execution.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
