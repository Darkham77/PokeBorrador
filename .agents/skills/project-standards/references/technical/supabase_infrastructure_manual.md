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
- **QNAP NAS External IP Drop Trap**: By default, a QNAP NAS will drop reply packets destined to public IP addresses if its local firewall (**QuFirewall**) is active (and set to block non-local subnets) or if the **Default Gateway** on the active Virtual Switch is misconfigured.
  - *Symptom*: Sniffer on `bridge-local` shows incoming packets (`←`) to the NAS on port `8443` but no reply packets (`→`).
  - *Fix (Bypass)*: Modify the **Hairpin NAT** rule in the router by unsetting the `src-address` filter (removing the local subnet restriction). This forces the router to masquerade **all** incoming traffic destined for the NAS (including external public IPs) to the router's local IP (`192.168.88.1`). The NAS receives them as local traffic, replies to the router, and the connection works perfectly.
- **MikroTik RouterOS v7 FIB Decoupling Trap**: In RouterOS v7, Mangle `mark-routing` actions and routing tables are decoupled. The routing engine ignores marked packets and searches the `main` table unless a corresponding **Routing Rule** maps the mark to the table.
  - *Fix*: You MUST add explicit routing rules:

    ```routeros
    /routing rule add routing-mark=to_ISP_1_franco action=lookup table=to_ISP_1_franco
    /routing rule add routing-mark=to_ISP_2_omar action=lookup table=to_ISP_2_omar
    ```

- **"Excluir Router" Prerouting Accept Trap**: Many MikroTik multi-WAN setups include a high-priority accept rule for local traffic (`chain=prerouting action=accept dst-address-type=local comment="Excluir Router del Balanceo"`). When external packets are masqueraded to the router's IP (`192.168.88.1`), their reply packets are destined for `192.168.88.1` and hit this accept rule, terminating Mangle evaluation early. This prevents them from being marked with `to_ISP_1_franco`, causing them to route out the default WAN in `main` (Claro) with Personal's public IP as source, resulting in symmetric routing drops.
  - *Fix (Quirúrgico)*: Add a high-priority, ultra-specific rule before the accept rule to intercept and route NAS replies (restricted to external connections via `connection-mark` to prevent internal loopback disconnection):

    ```routeros
    /ip firewall mangle add chain=prerouting action=mark-routing new-routing-mark=to_ISP_1_franco passthrough=no src-address=192.168.88.200 src-port=8443 protocol=tcp connection-mark=ISP1-input comment="Parche Quirurgico - Supabase WAN1 Reply" place-before=[Excluir Router index]
    ```

---

## ⏱️ Timezone & Timestamp Responsibility Split

The project uses `VITE_TIMEZONE` (e.g., `America/Argentina/Buenos_Aires`) in the `.env` file. Understanding **where this setting applies** prevents misdiagnosing timezone bugs:

| Layer | Timezone | Behavior |
| :--- | :--- | :--- |
| **Vite build** (`vite.config.ts`) | `VITE_TIMEZONE` from `.env` | Formats the `appVersion` string (e.g., `v2026.06.04.1700`) using local time. This is the only place where `VITE_TIMEZONE` has effect. |
| **PostgreSQL `TIMESTAMPTZ`** | UTC (internal) | Always stores in UTC regardless of session timezone. `NOW()` in upserts is correct and must **not** be replaced with a client-computed local timestamp. |
| **Server update script** (`update_supabase_db.ts`) | N/A | Reads the pre-computed version string from `public/version.json` (written by Vite at build time) and uploads it as-is. It does not recalculate or reformat time. |

The symptom of confusing these layers is attempting to change `NOW()` to a timezone-aware string in SQL, which is unnecessary and wrong. `TIMESTAMPTZ` handles timezone conversion transparently at query time.

---

- **ESLint Code Quality Standards**:
  - **Double-Quoted Dollar Signs**: Never escape dollar signs (`\$`) in regular double-quoted strings (`"..."`) or regex literals inside deployment scripts. Escaping them is only valid within template literals and will trigger ESLint `no-useless-escape` errors.
  - **Non-Empty Catch Blocks**: Avoid writing empty `catch {}` blocks in node scripts. Always add at least a descriptive comment (e.g., `// Silently ignore`) inside the catch block to satisfy ESLint `no-empty` rules.
