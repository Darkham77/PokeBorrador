# Supabase Infrastructure & Docker Manual

This manual documents the containerized architecture of the Poké Vicio server ecosystem.

## 🐳 Docker-Native Flow

The project utilizes a 100% native Docker deployment, eliminating host-level dependencies and manual git clones for the database.

### 1. Self-Contained Database

The PostgreSQL database is built as a custom image (`Dockerfile.db`) that packages the standard Supabase schema.

- **Portability**: The image can be deployed to any Docker-enabled environment without external scripts.

### 2. Automated Migrations (Sidecar Pattern)

A dedicated `db-migrator` service in `docker-compose.yml` handles schema parity on every startup.

- **Trigger**: Runs automatically when the infrastructure is lifted.
- **Source**: Uses the local `supabase/migrations` directory.

### 3. Deployment Commands

```bash
# Full rebuild and lift
docker-compose up -d --build

# View logs of the migration process
docker-compose logs -f db-migrator
```

---

## 🛠️ Multi-Server Orchestration

The client supports dynamic switching between official and local instances.

### 1. Configuration Centralization

All servers are registered in `src/data/official_servers.ts`.

- **Environment Variables**: Production credentials MUST be stored in `.env`.
- **Local Fallback**: Docker instances use a pre-configured `anonKey` by default.

### 2. Health Monitoring

The client performs a "permissive ping" to verify server availability.

- **Online Confirm**: 2xx, 401, 403.
- **Offline Confirm**: 5xx, Network Timeout.

---

## 🚨 Maintenance Rules

- **Schema Changes**: To update the database schema, add a new `.sql` file to `supabase/migrations`. The `db-migrator` will apply it on the next restart.

---

## 🔒 Security Hardening & RPC Standards

### 1. GraphQL Schema Masking

Since Poké Vicio communicates exclusively via PostgREST (REST API) and does not utilize GraphQL, exposing the database schema structure increases metadata footprint.

- **Rule**: Mask all tables from the `pg_graphql` schema extension using explicit table comments:

  ```sql
  COMMENT ON TABLE public.table_name IS '@graphql(name: "hidden")';
  ```

### 2. Anon Privilege Revocation (Defense-in-Depth)

By default, PostgreSQL grants read permissions to all roles.

- **Rule**: Strictly private tables (e.g., `game_saves`, `eggs`, `chat_messages`) must explicitly revoke `SELECT` privileges from the anonymous (`anon`) role:

  ```sql
  REVOKE SELECT ON TABLE public.table_name FROM anon;
  GRANT SELECT ON TABLE public.table_name TO authenticated;
  ```

### 3. Security Definer RPC Execution Control

APIs implemented as database functions that bypass standard RLS (using `SECURITY DEFINER`) present potential security gaps if accessible by unauthorized callers.

- **Rule**: Explicitly revoke execute access on all `SECURITY DEFINER` functions from `PUBLIC` and `anon` roles, granting execution strictly to `authenticated`:

  ```sql
  REVOKE EXECUTE ON FUNCTION public.my_rpc_function() FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.my_rpc_function() TO authenticated;
  ```

- **Failsafe validation**: Always validate caller identity internally by comparing the target entity owner to `auth.uid()` within the function body to prevent signature or ID spoofing.

---

## 🏗️ NAS & Postgres 15 Deployment (Qnap/Synology)

When deploying to a restricted NAS environment using Postgres 15+:

- **Superuser Mandate**: Postgres 15 introduces stricter schema ownership rules. During initialization, you MUST grant `SUPERUSER` to the core Supabase roles (`supabase_admin`, `authenticator`) to ensure migrations can bypass permission deadlocks on the `public` schema.
- **Healthcheck Jitter**: Increase the `interval` and `retries` for the `db` healthcheck to accommodate lower CPU priority on NAS background tasks.
- **MikroTik Router Loopback & Hairpin NAT**: When mapping external ports (e.g., `8443` HTTPS via a public DDNS domain like `myqnapcloud.com`) to the internal QNAP local IP address, devices inside the same LAN will fail to connect due to loopback routing issues unless **Hairpin NAT** (a `src-nat` rule with a `masquerade` action for the local subnet directed to the target IP) is active on the MikroTik router.
- **ESLint Code Quality Standards**:
  - **Double-Quoted Dollar Signs**: Never escape dollar signs (`\$`) in regular double-quoted strings (`"..."`) or regex literals inside deployment scripts. Escaping them is only valid within template literals and will trigger ESLint `no-useless-escape` errors.
  - **Non-Empty Catch Blocks**: Avoid writing empty `catch {}` blocks in node scripts. Always add at least a descriptive comment (e.g., `// Silently ignore`) inside the catch block to satisfy ESLint `no-empty` rules.
