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
- **Image Bloat**: Periodically run `docker system prune` to clear old build stages from the custom DB image.
