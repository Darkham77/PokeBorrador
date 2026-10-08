# 🐘 Supabase Self-Hosted with Docker — Deployment Manual

> **Official Source:** <https://supabase.com/docs/guides/self-hosting/docker>  
> **Last Review:** May 2026

---

## 📋 Table of Contents

1. [Before You Begin](#1-before-you-begin)
2. [System Requirements](#2-system-requirements)
3. [Installing Supabase](#3-installing-supabase)
4. [Configuring and Securing Supabase](#4-configuring-and-securing-supabase)
5. [Starting and Stopping Services](#5-starting-and-stopping-services)
6. [Accessing Supabase Studio (Dashboard)](#6-accessing-supabase-studio-dashboard)
7. [Accessing PostgreSQL](#7-accessing-postgresql)
8. [Accessing Edge Functions](#8-accessing-edge-functions)
9. [Accessing APIs](#9-accessing-apis)
10. [Configuring HTTPS](#10-configuring-https)
11. [Updating Supabase](#11-updating-supabase)
12. [Uninstalling](#12-uninstalling)
13. [Advanced Topics](#13-advanced-topics)
14. [Secrets Management](#14-secrets-management)

---

## 1. Before You Begin

This guide assumes you are comfortable with:

- ✅ Basic Linux server administration
- ✅ Docker and Docker Compose
- ✅ Networking fundamentals (ports, DNS, firewalls)

If you are new to these topics, consider starting with the [managed Supabase platform](https://supabase.com/dashboard) (free tier available).

### Required Tools

| Tool | Installation |
| ------------- | ------------- |
| **Git** | <https://git-scm.com/downloads> |
| **Docker Desktop** (Windows/macOS) | <https://docs.docker.com/desktop/install/windows-install/> |
| **Docker Engine + Compose** (Linux VPS) | <https://docs.docker.com/engine/install/> |
| **OpenSSL** | Included in Git Bash / WSL / Linux |

---

## 2. System Requirements

Minimum requirements to run all Supabase components (development and medium production workloads):

| Resource | Recommended Minimum |
| --------- | ------------------- |
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 20 GB SSD |
| OS | Ubuntu 22.04 LTS / Debian 12 / Windows with WSL2 |

> **Tip:** If you do not need services like Logflare (Analytics), Realtime, Storage, imgproxy, or Edge Runtime (Functions), you can remove them from `docker-compose.yml` to reduce required system resources.

---

## 3. Installing Supabase

### Step 3.1 — Clone the Official Repository

```bash
# Get the code (latest commit only, shallow clone)
git clone --depth 1 https://github.com/supabase/supabase

# Create your project directory
mkdir supabase-project

# Directory structure should look like:
# .
# ├── supabase
# └── supabase-project
```

### Step 3.2 — Copy Configuration Files

```bash
# Copy compose files to project
cp -rf supabase/docker/* supabase-project/

# Copy sample .env file
cp supabase/docker/.env.example supabase-project/.env

# Enter project directory
cd supabase-project
```

> **Windows PowerShell equivalent:**
>
> ```powershell
> Copy-Item -Recurse -Force "supabase\docker\*" "supabase-project\"
> Copy-Item "supabase\docker\.env.example" "supabase-project\.env"
> ```

### Step 3.3 — Pull Docker Images

```bash
docker compose pull
```

> **Note for Rootless Docker:** If running Docker in rootless mode, edit `.env` and set:
>
> ```env
> DOCKER_SOCKET_LOCATION=/run/user/1000/docker.sock
> ```
>
> Otherwise, you may encounter: `container supabase-vector exited (0)`

---

## 4. Configuring and Securing Supabase

> ⚠️ **NEVER start Supabase with default credentials from `.env.example`.**  
> Complete these steps before starting any service.

### Step 4.1 — Generate Secure Keys (Quick Setup)

```bash
# Automatically generate secure passwords and secrets
sh utils/generate-keys.sh

# Add new API keys and asymmetric key pair
sh utils/add-new-auth-keys.sh
```

Inspect output from both scripts and verify `.env` before proceeding.

### Step 4.2 — Configure Supabase URLs

Edit these variables in `.env`:

| Variable | Description | Example |
| ---------- | ------------- | --------- |
| `SUPABASE_PUBLIC_URL` | Base URL for internet access (Dashboard, API, Storage) | `http://your-ip.com:8000` |
| `API_EXTERNAL_URL` | Used by Auth for redirect callbacks | `http://your-ip.com:8000` |
| `SITE_URL` | Default redirect URL for Auth | `http://your-ip.com:3000` |

**Understanding `<your-domain>`:**

- **Basic setup:** Kong listens on port `8000` → `http://<your-domain>:8000`
- **With reverse proxy:** TLS terminates on port `443` → `https://<your-domain>`

### Step 4.3 — Where to Find Your Credentials

After running scripts, important credentials in `.env` are:

| Variable | Usage |
| ---------- | ----- |
| `POSTGRES_PASSWORD` | DB Password (for connection strings and psql) |
| `SUPABASE_PUBLISHABLE_KEY` | Public API key for frontend (new key system) |
| `SUPABASE_SECRET_KEY` | Secret API key for server — **NEVER expose in frontend** |
| `SUPABASE_PUBLIC_URL` | URL passed as `supabaseUrl` to client libraries |
| `ANON_KEY` | (Legacy) Public API key with limited permissions |
| `SERVICE_ROLE_KEY` | (Legacy) API key with full DB access — **NEVER expose** |

> Generated keys expire in **5 years**. You can inspect them at [jwt.io](https://jwt.io) using your `JWT_SECRET`.

### Step 4.4 — Studio Authentication (Dashboard)

Studio access is protected with basic HTTP authentication.

**⚠️ Configure a secure password BEFORE starting Supabase.**  
The password must include at least one letter (not just numbers or symbols).

Edit in `.env`:

```env
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=your-secure-password-here
```

---

## 5. Starting and Stopping Services

### Start in Detached Mode (Background)

```bash
docker compose up -d
```

### Check Service Health

```bash
docker compose ps
```

After ~1 minute, all services should show `Up [...] (healthy)`.  
If you see `created` instead of `Up`, inspect container logs:

```bash
docker compose logs
```

Or inspect a specific service (e.g. analytics):

```bash
docker compose logs analytics
```

### Stop Services

```bash
docker compose down
```

> **⚠️ Windows CRLF Line Endings:**  
> If Kong fails to start with an entrypoint error, files may have CRLF instead of LF line breaks.  
> Re-clone the repository or convert `docker/` files to LF.  
> Fresh clones use LF automatically thanks to repo `.gitattributes`.

---

## 6. Accessing Supabase Studio (Dashboard)

By default, the dashboard is accessible on port `8000` through the API gateway (Kong).

| Environment | URL |
| --------- | ----- |
| Local | <http://localhost:8000> |
| VPS / Server | http://\<your-ip\>:8000 |
| With Domain | http://\<your-domain\>:8000 |

Log in using credentials set in [Studio Authentication](#step-44--studio-authentication-dashboard).

---

## 7. Accessing PostgreSQL

Supabase uses **Supavisor** as a connection pooler for Postgres.

Default `POOLER_TENANT_ID` is `your-tenant-id` (configurable in `.env`).

### Session Mode Connection (Direct Connection Equivalent)

```bash
psql 'postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[your-domain]:5432/postgres'
```

### Transaction Mode Connection (Pooling)

```bash
psql 'postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[your-domain]:6543/postgres'
```

> **Note:** When using parameterized `psql`, `-U` must be `postgres.[POOLER_TENANT_ID]`, not just `postgres`.

### Exposing Postgres Directly (Advanced)

By default, Postgres is accessible only through Supavisor. For direct access:

1. Comment out or remove `supavisor` service in `docker-compose.yml`
2. Add port mapping to `db` service:

```yaml
# docker-compose.yml
db:
  ports:
    - ${POSTGRES_PORT}:${POSTGRES_PORT}
  container_name: supabase-db
```

Then connect with:

```text
postgres://postgres:[POSTGRES_PASSWORD]@[your-server-ip]:5432/[POSTGRES_DB]
```

> ⚠️ **Security:** Configure firewall rules to restrict access strictly to trusted IPs.

---

## 8. Accessing Edge Functions

Edge Functions live in `volumes/functions/`. Default setup includes a `hello` function:

```bash
curl http://<your-domain>:8000/functions/v1/hello
```

To add new functions:

```bash
# Create function folder
mkdir -p volumes/functions/my-function
# Create file
touch volumes/functions/my-function/index.ts

# Restart service to detect changes
docker compose restart functions --no-deps
```

See [Self-Hosted Edge Functions Guide](https://supabase.com/docs/guides/self-hosting/self-hosted-functions) for details.

---

## 9. Accessing APIs

All APIs are exposed through the same API gateway (Kong) on port `8000`:

| Service | URL |
| ---------- | ----- |
| REST (PostgREST) | `http://<your-domain>:8000/rest/v1/` |
| Auth | `http://<your-domain>:8000/auth/v1/` |
| Storage | `http://<your-domain>:8000/storage/v1/` |
| Realtime | `http://<your-domain>:8000/realtime/v1/` |

---

## 10. Configuring HTTPS

By default, Supabase runs over HTTP. For production environments (especially OAuth), HTTPS with a valid TLS certificate is mandatory.

**Recommended Solution:** Place a reverse proxy (Caddy or Nginx) in front of the API gateway.

See [Configure HTTPS Guide](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https) for detailed instructions.

---

## 11. Updating Supabase

Stable releases are published approximately **once per month**.

### Pull Updated Images

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose down && docker compose up -d
```

### Update a Specific Image (e.g. Studio)

1. Check available tags at [Docker Hub - supabase/studio](https://hub.docker.com/r/supabase/studio/tags)
2. Identify latest release (e.g. `2025.11.26-sha-8f096b5`)
3. Edit `docker-compose.yml`:

   ```yaml
   image: supabase/studio:2025.11.26-sha-8f096b5
   ```

4. Run:

   ```bash
   docker compose pull
   docker compose down && docker compose up -d
   ```

See [Supabase Self-Hosted Changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md) to track changes.

---

## 12. Uninstalling

> ⚠️ **DANGER:** The following commands destroy all persistent data, including databases and storage volumes.

```bash
# Stop containers and remove volumes
docker compose down -v

# Remove Postgres data
rm -rf volumes/db/data

# Remove Storage data
rm -rf volumes/storage
```

---

## 13. Advanced Topics

### Architecture Overview

Supabase is built on open-source tools:

| Service | Description |
| ---------- | ------------- |
| **Studio** | Administration web dashboard |
| **Kong** | API gateway |
| **Auth** | JWT authentication API |
| **PostgREST** | Converts Postgres schema to RESTful API |
| **Realtime** | Listens to Postgres changes and broadcasts events |
| **Storage** | RESTful API for S3-compatible file storage |
| **imgproxy** | Fast and secure on-the-fly image transformations |
| **postgres-meta** | REST API to manage Postgres configuration |
| **Postgres** | Primary relational database engine |
| **Edge Runtime** | Server for Edge Functions (Deno) |
| **Logflare** | Log management platform |
| **Vector** | Observability data pipeline |
| **Supavisor** | High-performance Postgres connection pooler |

### Changing Database Password

```bash
# After initial setup
sh utils/db-passwd.sh

# Restart all services
docker compose up -d --force-recreate
```

The script generates a new password, updates database roles, and writes changes to `.env`.

### Setting Initial DB Password

In `.env`, before first launch:

```env
POSTGRES_PASSWORD=your-secure-alphanumeric-password
```

Follow [Postgres Password Guidelines](https://supabase.com/docs/guides/database/postgres/roles#passwords). To prevent URL-encoding issues, use only alphanumeric characters.

### Configuring API Keys (Legacy System)

If using legacy API key architecture, configure in `.env`:

| Variable | Description |
| ---------- | ------------- |
| `JWT_SECRET` | Used by Auth, PostgREST, and services to sign and verify JWT tokens |
| `ANON_KEY` | Client-side API key with public permissions (`anon` role) |
| `SERVICE_ROLE_KEY` | Server-side API key with full privileges (`service_role` role) |

### Available System Secrets

| Secret | Length | Generation Command |
| -------- | ---------- | ------------ |
| `SECRET_KEY_BASE` | min 64 chars | `openssl rand -base64 48` |
| `VAULT_ENC_KEY` | exactly 32 chars | `openssl rand -hex 16` |
| `PG_META_CRYPTO_KEY` | min 32 chars | `openssl rand -base64 24` |
| `LOGFLARE_PUBLIC_ACCESS_TOKEN` | min 32 chars | `openssl rand -base64 24` |
| `LOGFLARE_PRIVATE_ACCESS_TOKEN` | min 32 chars | `openssl rand -base64 24` |
| `S3_PROTOCOL_ACCESS_KEY_ID` | — | `openssl rand -hex 16` |
| `S3_PROTOCOL_ACCESS_KEY_SECRET` | — | `openssl rand -hex 32` |
| `MINIO_ROOT_PASSWORD` | 8+ chars | `openssl rand -hex 16` |

### Configuring Email Server (SMTP)

In `.env`:

```env
SMTP_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-user@gmail.com
SMTP_PASS=your-app-password
SMTP_SENDER_NAME=Poké Vicio Online
```

Restart services to apply configuration. **AWS SES** is recommended for production.

### Configuring S3 Storage

By default, files are stored locally. You can attach Storage to any S3-compatible backend (AWS S3, RustFS, MinIO, Cloudflare R2).

See [Configure S3 Storage Guide](https://supabase.com/docs/guides/self-hosting/self-hosted-s3).

### Enabling Supabase AI Assistant

Optional. Add your OpenAI API key in `.env`:

```env
OPENAI_API_KEY=sk-...
```

### Configuring log_min_messages in Postgres

Default is `fatal` to avoid redundant Realtime logs. You can customize it in `docker-compose.yml` using any [Postgres Severity Level](https://www.postgresql.org/docs/current/runtime-config-logging.html#RUNTIME-CONFIG-SEVERITY-LEVELS).

### Storage on macOS

On macOS, Docker Desktop bind mounts have known limitations (lack of `xattr` support, file permission issues) that may impact Storage. Replace bind mounts with named Docker volumes in `docker-compose.yml`.

---

## 14. Secrets Management

All secrets reside in `.env` by default. **For production, using an external secrets manager is strongly recommended:**

| Tool | Link |
| ------------- | ------ |
| **Doppler** | <https://www.doppler.com/> |
| **Infisical** | <https://infisical.com/> |
| **Azure Key Vault** | <https://docs.microsoft.com/azure/key-vault> |
| **AWS Secrets Manager** | <https://aws.amazon.com/secrets-manager/> |
| **GCP Secret Manager** | <https://cloud.google.com/secret-manager> |
| **HashiCorp Vault** | <https://www.hashicorp.com/products/vault> |

---

## 🔗 Useful Links

- 📚 [Official Documentation - Self-Hosting Docker](https://supabase.com/docs/guides/self-hosting/docker)
- 🔑 [Configuring New API Keys](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys)
- 🔒 [Adding HTTPS with Reverse Proxy](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https)
- 🌐 [Configuring OAuth Providers](https://supabase.com/docs/guides/self-hosting/self-hosted-oauth)
- 📦 [Configuring S3 Storage](https://supabase.com/docs/guides/self-hosting/self-hosted-s3)
- ⚡ [Self-Hosted Edge Functions](https://supabase.com/docs/guides/self-hosting/self-hosted-functions)
- 📋 [Changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md)
- 🐳 [Supabase on Docker Hub](https://hub.docker.com/u/supabase)
