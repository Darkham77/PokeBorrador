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
- **Public Read & RLS Policy Contract**: Ensure every public table (`events_config`, `system_config`, `ranked_rules_config`, `market_listings`, `competition_results`) includes explicit `GRANT SELECT ... TO anon, authenticated, service_role` and `FOR SELECT USING (true)` policies alongside `ENABLE ROW LEVEL SECURITY`.

# Verification
- Run Supabase CLI schema checks and remote migration validations.

# Key Files

- [`setup_supabase.ts`](./setup_supabase.ts): Script to automate database setup.

# Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
