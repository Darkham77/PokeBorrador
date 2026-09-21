# Purpose
Manage online cloud persistence layer (Supabase schemas, migrations, policies, edge functions).

# Ownership
Cloud / Backend Engineers.

# Local Contracts
- DBRouter-enforced online context isolation.
- **Major Database Engine Upgrade Isolation Mandate**: Upgrading PostgreSQL across major versions (e.g., PostgreSQL 15 to 17) mandates dedicated versioned volumes (`db-data-v3`, `db-config-v3`). Reusing legacy configuration and data volumes across major versions causes fatal startup crashes due to binary cluster incompatibilities, missing required configuration directories (`/etc/postgresql-custom/conf.d`), and container UID shifts (Debian UID 105 in PG15 vs Alpine/Nix UID 100 in PG17 causing permission denied on `pgsodium_root.key`). All major database upgrades MUST follow the strict 4-step protocol: logical JSON backup (`npm run database:backup`), fresh volume initialization, automated migration execution (`npm run database:update`), and logical restoration (`npm run database:restore`).
- **Official Supabase Upstream Bundle Interoperability Contract**: Self-hosted Supabase deployments MUST strictly pin microservice image tags to the coordinated version matrix declared in `versions.md` / `docker-compose.yml` of the official `supabase/supabase` repository. While individual component repositories (GoTrue, Storage API, Realtime, Logflare, Supavisor) publish point releases to Docker Hub frequently, adopting uncoordinated tags triggers subtle RPC and API drift between Studio, PostgREST, and Auth. Image monitoring tools (such as Arcane or Watchtower) flagging newer isolated tags must be ignored in favor of the official tested bundle.
- **Arcane Single-File Unified Deployment Standard**: Self-hosted deployments managed by Arcane require a single canonical `docker-compose.yml` file. Deployment automation in [`setup_supabase.ts`](./setup_supabase.ts) MUST generate the canonical `docker-compose.yml` directly (never auxiliary filenames) and consolidate all 13 core services (including Kong 3.9.3 and Logflare/Vector logging) using `supabase-volumes-v2` for volume sharing. All generated compose files MUST pass syntax validation via `docker compose config` with zero duplicate directives (e.g., `RLIMIT_NOFILE`).

# Work Guidance
- Write valid migrations utilizing Supabase CLI templates.
- Maintain credentials securely inside local `.env` files.
- Apply Row Level Security (RLS) policies to protect online player data.
- **Public Read & RLS Policy Contract**: Ensure every public table (`events_config`, `system_config`, `ranked_rules_config`, `market_listings`, `competition_results`) includes explicit `GRANT SELECT ... TO anon, authenticated, service_role` and `FOR SELECT USING (true)` policies alongside `ENABLE ROW LEVEL SECURITY`.

# Verification
- Run Supabase CLI schema checks and remote migration validations.

# Key Files

- [`setup_supabase.ts`](./setup_supabase.ts): Script to automate database setup.

# Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
