# Purpose

Manage online cloud persistence layer (Supabase schemas, migrations, policies, edge functions).

## Ownership

Cloud / Backend Engineers.

## Local Contracts

- DBRouter-enforced online context isolation.
- **Major Database Engine Upgrade Isolation Mandate**: Upgrading PostgreSQL across major versions (e.g., PostgreSQL 15 to 17) mandates dedicated versioned volumes (`db-data-v3`, `db-config-v3`). Reusing legacy configuration and data volumes across major versions causes fatal startup crashes due to binary cluster incompatibilities, missing required configuration directories (`/etc/postgresql-custom/conf.d`), and container UID shifts (Debian UID 105 in PG15 vs Alpine/Nix UID 100 in PG17 causing permission denied on `pgsodium_root.key`). All major database upgrades MUST follow the strict 4-step protocol: logical JSON backup (`npm run database:backup`), fresh volume initialization, automated migration execution (`npm run database:update`), and logical restoration (`npm run database:restore`).
- **Official Supabase Upstream Bundle Interoperability Contract**: Self-hosted Supabase deployments MUST strictly pin microservice image tags to the coordinated version matrix declared in `versions.md` / `docker-compose.yml` of the official Supabase repository (https://github.com/supabase/supabase). While individual component repositories (GoTrue, Storage API, Realtime, Logflare, Supavisor) publish point releases to Docker Hub frequently, adopting uncoordinated tags triggers subtle RPC and API drift between Studio, PostgREST, and Auth. Image monitoring tools (such as Arcane or Watchtower) flagging newer isolated tags must be ignored in favor of the official tested bundle.
- **Arcane Single-File Unified Deployment Standard (`auditor-supabase` / `@francogp/auditor/supabase`)**: Self-hosted deployments managed by Arcane require a single canonical `docker-compose.yml` file. All Supabase Docker orchestration (`remote`, `localFull`, `lite.test`) is governed declaratively in [`.auditor/audit.config.ts`](../.auditor/audit.config.ts) (`supabaseDocker` with `projectSlug: 'pokevicio'`) and executed via `auditor-supabase` (`npm run supabase:manage <subcommand>`). For `remote`, `composeAstEngine` rewrites all bind-mounts into named volumes (`supabase-volumes-v2`, `db-data-v3`, `db-config-v3`, `storage-data`), initializes shared assets via `supabase-config-init`, and deploys Envoy (`api-gw`) with `pokevicio-*` container prefixes (`pokevicio-supabase-db`, `pokevicio-supabase-envoy`, etc.). For `localFull`, relative mounts are rebased to `../../docker/volumes/...` on isolated ports (`8020`, `5452`, `6563`, `3020`) with `realtime-dev.pokevicio-realtime`. All generated compose files pass `docker compose config -q` validation.

## Key Files

- [`.auditor/audit.config.ts`](../.auditor/audit.config.ts): SSoT `supabaseDocker` configuration for `remote`, `localFull`, and `lite.test` profiles.

## Work Guidance

- Write valid migrations utilizing Supabase CLI templates.
- Maintain credentials securely inside local `.env` files.
- Apply Row Level Security (RLS) policies to protect online player data.
- **Public Read & RLS Policy Contract**: Ensure every public table (`events_config`, `system_config`, `ranked_rules_config`, `market_listings`, `competition_results`) includes explicit `GRANT SELECT ... TO anon, authenticated, service_role` and `FOR SELECT USING (true)` policies alongside `ENABLE ROW LEVEL SECURITY`.

## Verification

- Run Supabase CLI schema checks and remote migration validations.

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
