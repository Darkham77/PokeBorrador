---
name: env-multi-server-parser
description: Interprets, parses, and transforms environment variables from a unified master .env file containing multi-server grouped keys (SERVER_<profile>_<VAR>) and global settings (DOCKER_*). USE THIS SKILL WHENEVER the user requests server configuration, Supabase credential management, generating environment-specific .env files, modifying docker-compose.yml, or creating/executing deployment automation scripts (e.g., setup_supabase.ts), even if the .env file is not explicitly mentioned.
---

# Multi-Server Environment Interpreter & Parser (`.env`)

This skill defines the standards and procedures for AI agents to correctly interpret the project's unified master `.env` file and transform its data for clean injection into server configurations, Docker containers, and automation scripts.

## 1. Context & Master `.env` Architecture

The project utilizes a single master `.env` file as the single source of truth for multiple deployment environments/servers (e.g., `cloud`, `nas-franco`). To prevent naming collisions and maintain clear organization, variables are structured using the following prefix conventions:

- **Global Variables**: Shared across deployments or used for container/image management (e.g., `DOCKER_USER`, `DOCKER_REPO_DB`, `DOCKER_TAG_DB`).
- **Server-Specific Variables**: Strictly grouped using the prefix `SERVER_<profile_name>_<VARIABLE_NAME>`.
  - **Game & GUI Metadata**: Every server profile includes `SERVER_<profile>_ID`, `SERVER_<profile>_NAME`, and `SERVER_<profile>_REGION` to allow easy parsing of server registration data for the game client/GUI.
  - **Single Source of Truth Tenant ID**: To adhere to DRY principles, every server defines only `SERVER_<profile>_TENANT_ID`. When generating deployment configurations, the parser automatically propagates this value to `POOLER_TENANT_ID` and `STORAGE_TENANT_ID` as required by Supabase services.
  - Cloud Profile Example: `SERVER_cloud_ID=official-prod`, `SERVER_cloud_TENANT_ID=your-tenant-id`.
  - NAS Profile Example: `SERVER_nas-franco_ID=local-docker`, `SERVER_nas-franco_TENANT_ID=your-tenant-id`.

## 2. Parsing & Extraction Principles

When consuming, transforming, or generating configurations from the master `.env` file, YOU MUST follow these 4 strict rules:

### Rule 1: Target Profile Identification

Before performing any extraction, unambiguously identify the target environment or server profile requested by the user (e.g., `nas-franco` or `cloud`).

### Rule 2: Prefix Filtering & Stripping (Canonical Transformation)

Select only the variables matching the target profile prefix (`SERVER_<profile>_`). When injecting or exporting them for the final service consumption (Supabase, Docker, etc.), **strip the server prefix** to restore the canonical variable name expected by the application.

- *Source in master .env*: `SERVER_nas-franco_POSTGRES_PASSWORD=my_password`
- *Transformed result*: `POSTGRES_PASSWORD=my_password`

### Rule 3: Global Variable Inclusion

If the destination is a deployment configuration (e.g., `docker-compose.yml` or a build/push script), include applicable global variables (`DOCKER_*`) keeping their names intact.

### Rule 4: Strict Environment Isolation

**NEVER** include, mix, or expose variables belonging to one server profile in the configuration or deployment of another. Isolation must be absolute.

## 3. Implementation Patterns & Use Cases

### A. Generating Local Server-Specific `.env` Files

When required to generate an independent `.env` file to be loaded onto a specific server:

```env
# Example generated output for the 'cloud' server
POSTGRES_PASSWORD=cloud_pass_placeholder
JWT_SECRET=6mQY9Y4F-XpM5-U5I0-7Z-N1E3M-XpM5-U5I0-7Z-N1E3M=
TENANT_ID=your-tenant-id
POOLER_TENANT_ID=your-tenant-id
STORAGE_TENANT_ID=your-tenant-id
```

### B. Consumption in Automation Scripts (Node.js 26+ ESM / TypeScript)

When developing or modifying scripts (such as `setup_supabase.ts`), implement a parser that dynamically filters keys from the master environment based on the active server argument, utilizing Node.js 26+ native features:

```typescript
import fs from 'node:fs/promises';

async function loadServerConfig(masterEnvPath: string, serverProfile: string): Promise<Record<string, string>> {
  const content = await fs.readFile(masterEnvPath, 'utf-8');
  const cleanConfig: Record<string, string> = {};
  
  const prefix = `SERVER_${serverProfile}_`;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    
    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();
    const value = trimmed.substring(idx + 1).trim();
    
    if (key.startsWith(prefix)) {
      const cleanKey = key.substring(prefix.length);
      cleanConfig[cleanKey] = value;
    } else if (key.startsWith('DOCKER_')) {
      cleanConfig[key] = value;
    }
  }
  return cleanConfig;
}
```

### C. Injection into `docker-compose.yml`

Ensure that services in `docker-compose.yml` reference clean canonical names (e.g., `${POSTGRES_PASSWORD}`) and that the runtime environment provides these previously transformed variables.

## 4. Complete Transformation Example

**Input (Unified Master `.env`):**

```env
DOCKER_USER=francogp612
SERVER_cloud_ID=official-prod
SERVER_cloud_NAME="Poké Vicio Oficial"
SERVER_cloud_REGION="Global / Cloud"
SERVER_cloud_TENANT_ID=your-tenant-id
SERVER_cloud_JWT_SECRET=secret_cloud_123
SERVER_nas-franco_ID=local-docker
SERVER_nas-franco_NAME="Servidor Dev (Docker)"
SERVER_nas-franco_REGION="Desarrollo"
SERVER_nas-franco_TENANT_ID=your-tenant-id
SERVER_nas-franco_JWT_SECRET=secret_nas_456
```

**Requested Output (Clean configuration for `nas-franco`):**

```env
DOCKER_USER=francogp612
ID=local-docker
NAME="Servidor Dev (Docker)"
REGION="Desarrollo"
TENANT_ID=your-tenant-id
POOLER_TENANT_ID=your-tenant-id
STORAGE_TENANT_ID=your-tenant-id
JWT_SECRET=secret_nas_456
```
