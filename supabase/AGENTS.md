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
This folder contains standard Supabase CLI configurations, schemas, and migrations.
