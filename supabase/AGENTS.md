# Purpose
Manage online cloud persistence layer (Supabase schemas, migrations, policies, edge functions).

# Ownership
Cloud / Backend Engineers.

# Local Contracts
- DBRouter-enforced online context isolation.

# Work Guidance
- Write valid migrations utilizing Supabase CLI templates.
- Maintain credentials securely inside local `.env` files.
- Apply Row Level Security (RLS) policies to protect online player data.

# Verification
- Run Supabase CLI schema checks and remote migration validations.

# Child DOX Index

- [docker/](./docker/): Local Docker configurations. _(gitignored — contains local credentials, not in repo)_
- [generated/](./generated/): Generated files and schemas. _(gitignored — local-only environment files)_
- [setup_supabase.ts](./setup_supabase.ts): Script to automate database setup.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
