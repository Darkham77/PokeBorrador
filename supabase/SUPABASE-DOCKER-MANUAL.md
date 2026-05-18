# 🐘 Supabase Self-Hosted con Docker — Manual de Despliegue

> **Fuente oficial:** <https://supabase.com/docs/guides/self-hosting/docker>  
> **Última revisión:** Mayo 2026

---

## 📋 Tabla de Contenidos

1. [Antes de empezar](#1-antes-de-empezar)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Instalando Supabase](#3-instalando-supabase)
4. [Configurar y asegurar Supabase](#4-configurar-y-asegurar-supabase)
5. [Iniciar y detener los servicios](#5-iniciar-y-detener-los-servicios)
6. [Acceder a Supabase Studio (Dashboard)](#6-acceder-a-supabase-studio-dashboard)
7. [Acceder a PostgreSQL](#7-acceder-a-postgresql)
8. [Acceder a Edge Functions](#8-acceder-a-edge-functions)
9. [Acceder a las APIs](#9-acceder-a-las-apis)
10. [Configurar HTTPS](#10-configurar-https)
11. [Actualizar Supabase](#11-actualizar-supabase)
12. [Desinstalar](#12-desinstalar)
13. [Temas Avanzados](#13-temas-avanzados)
14. [Gestión de Secretos](#14-gestión-de-secretos)

---

## 1. Antes de empezar

Esta guía asume que estás cómodo con:

- ✅ Administración básica de servidores Linux
- ✅ Docker y Docker Compose
- ✅ Fundamentos de redes (puertos, DNS, firewalls)

Si sos nuevo en estos temas, considerá empezar con la [plataforma administrada de Supabase](https://supabase.com/dashboard) (gratuita).

### Herramientas necesarias

| Herramienta | Instalación |
| ------------- | ------------- |
| **Git** | <https://git-scm.com/downloads> |
| **Docker Desktop** (Windows/macOS) | <https://docs.docker.com/desktop/install/windows-install/> |
| **Docker Engine + Compose** (Linux VPS) | <https://docs.docker.com/engine/install/> |
| **OpenSSL** | Incluido en Git Bash / WSL / Linux |

---

## 2. Requisitos del sistema

Requisitos mínimos para correr todos los componentes de Supabase (desarrollo y cargas medianas de producción):

| Recurso | Mínimo recomendado |
| --------- | ------------------- |
| CPU | 2 cores |
| RAM | 4 GB |
| Disco | 20 GB SSD |
| OS | Ubuntu 22.04 LTS / Debian 12 / Windows con WSL2 |

> **Tip:** Si no necesitás servicios como Logflare (Analytics), Realtime, Storage, imgproxy, o Edge Runtime (Functions), podés removerlos del `docker-compose.yml` para reducir los recursos necesarios.

---

## 3. Instalando Supabase

### Paso 3.1 — Clonar el repositorio oficial

```bash
# Obtener el código (solo el último commit, sin historial)
git clone --depth 1 https://github.com/supabase/supabase

# Crear tu directorio de proyecto
mkdir supabase-project

# La estructura debe verse así:
# .
# ├── supabase
# └── supabase-project
```

### Paso 3.2 — Copiar los archivos de configuración

```bash
# Copiar los archivos compose al proyecto
cp -rf supabase/docker/* supabase-project/

# Copiar el .env de ejemplo
cp supabase/docker/.env.example supabase-project/.env

# Entrar al directorio del proyecto
cd supabase-project
```

> **Windows PowerShell equivalente:**
>
> ```powershell
> Copy-Item -Recurse -Force "supabase\docker\*" "supabase-project\"
> Copy-Item "supabase\docker\.env.example" "supabase-project\.env"
> ```

### Paso 3.3 — Descargar las imágenes Docker

```bash
docker compose pull
```

> **Nota para Docker Rootless:** Si usás Docker en modo rootless, editá `.env` y configurá:
>
> ```env
> DOCKER_SOCKET_LOCATION=/run/user/1000/docker.sock
> ```
>
> De lo contrario verás el error: `container supabase-vector exited (0)`

---

## 4. Configurar y asegurar Supabase

> ⚠️ **NUNCA inicies Supabase con las credenciales de ejemplo del `.env.example`.**  
> Seguí estos pasos antes de levantar cualquier servicio.

### Paso 4.1 — Generar claves seguras (Quick Setup)

```bash
# Genera passwords y secrets seguros automáticamente
sh utils/generate-keys.sh

# Agrega las nuevas API keys y el par de claves asimétricas
sh utils/add-new-auth-keys.sh
```

Revisá la salida de ambos scripts y verificá el archivo `.env` antes de continuar.

### Paso 4.2 — Configurar URLs de Supabase

Editá estas variables en el `.env`:

| Variable | Descripción | Ejemplo |
| ---------- | ------------- | --------- |
| `SUPABASE_PUBLIC_URL` | URL base para acceder desde Internet (Dashboard, API, Storage) | `http://tuip.com:8000` |
| `API_EXTERNAL_URL` | Usada por Auth para configurar callbacks | `http://tuip.com:8000` |
| `SITE_URL` | URL de redirect por defecto para Auth | `http://tuip.com:3000` |

**¿Qué significa `<your-domain>`?**

- **Setup básico:** Kong escucha en puerto `8000` → `http://<your-domain>:8000`
- **Con reverse proxy:** TLS termina en puerto `443` → `https://<your-domain>`

### Paso 4.3 — Dónde encontrar tus credenciales

Después de ejecutar los scripts, las credenciales importantes en `.env` son:

| Variable | Uso |
| ---------- | ----- |
| `POSTGRES_PASSWORD` | Password de la DB (para connection strings y psql) |
| `SUPABASE_PUBLISHABLE_KEY` | API key pública para el frontend (nuevo sistema) |
| `SUPABASE_SECRET_KEY` | API key secreta para el servidor — **NUNCA exponer en frontend** |
| `SUPABASE_PUBLIC_URL` | URL que se pasa como `supabaseUrl` a los client libraries |
| `ANON_KEY` | (Legacy) API key pública con permisos limitados |
| `SERVICE_ROLE_KEY` | (Legacy) API key con acceso completo a la DB — **NUNCA exponer** |

> Las claves generadas expiran en **5 años**. Podés verificarlas en [jwt.io](https://jwt.io) usando el valor de `JWT_SECRET`.

### Paso 4.4 — Autenticación del Studio (Dashboard)

El acceso al Studio está protegido con autenticación HTTP básica.

**⚠️ Configurá una password segura ANTES de iniciar Supabase.**  
La password debe incluir al menos una letra (no solo números ni caracteres especiales).

Editá en `.env`:

```env
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=tu-password-segura-aqui
```

---

## 5. Iniciar y detener los servicios

### Iniciar en modo detached (background)

```bash
docker compose up -d
```

### Verificar estado de los servicios

```bash
docker compose ps
```

Después de ~1 minuto, todos los servicios deben mostrar `Up [...] (healthy)`.  
Si ves estado `created` pero no `Up`, corré el script de diagnóstico:

```bash
sh tests/test-container-logs.sh
```

O inspeccioná logs de un contenedor específico:

```bash
docker compose logs analytics
```

### Detener los servicios

```bash
docker compose down
```

> **⚠️ Windows: Saltos de línea CRLF**  
> Si Kong falla al iniciar con un error de entrypoint, los archivos pueden tener saltos CRLF en lugar de LF.  
> Volvé a clonar el repositorio, o normalizá todo el directorio `docker/` a LF.  
> Los clones nuevos ya usan LF gracias al `.gitattributes` del repo.

---

## 6. Acceder a Supabase Studio (Dashboard)

Por defecto, el dashboard está disponible en el puerto `8000` a través del API gateway (Kong).

| Entorno | URL |
| --------- | ----- |
| Local | <http://localhost:8000> |
| VPS / servidor | http://\<tu-ip\>:8000 |
| Con dominio | http://\<tu-dominio\>:8000 |

Se te pedirá el usuario y contraseña configurados en [Studio authentication](#paso-44--autenticación-del-studio-dashboard).

---

## 7. Acceder a PostgreSQL

Supabase usa **Supavisor** como connection pooler para Postgres.

El `POOLER_TENANT_ID` por defecto es `your-tenant-id` (configurable en `.env`).

### Conexión en modo sesión (equivalente a conexión directa)

```bash
psql 'postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[your-domain]:5432/postgres'
```

### Conexión en modo transaccional (pooling)

```bash
psql 'postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[your-domain]:6543/postgres'
```

> **Nota:** Al usar `psql` con parámetros, el `-U` debe ser `postgres.[POOLER_TENANT_ID]`, no solo `postgres`.

### Exponer Postgres directamente (avanzado)

Por defecto, Postgres solo es accesible a través de Supavisor. Para acceso directo:

1. Comentar o eliminar el servicio `supavisor` en `docker-compose.yml`
2. Agregar el mapeo de puertos al servicio `db`:

```yaml
# docker-compose.yml
db:
  ports:
    - ${POSTGRES_PORT}:${POSTGRES_PORT}
  container_name: supabase-db
```

Luego podés conectarte con:

```text
postgres://postgres:[POSTGRES_PASSWORD]@[your-server-ip]:5432/[POSTGRES_DB]
```

> ⚠️ **Seguridad:** Configurá reglas de firewall para restringir el acceso solo a IPs de confianza.

---

## 8. Acceder a Edge Functions

Las Edge Functions viven en `volumes/functions/`. El setup por defecto incluye una función `hello`:

```bash
curl http://<your-domain>:8000/functions/v1/hello
```

Para agregar nuevas funciones:

```bash
# Crear la función en el directorio
mkdir -p volumes/functions/mi-funcion
# Crear el archivo
touch volumes/functions/mi-funcion/index.ts

# Reiniciar el servicio para que las detecte
docker compose restart functions --no-deps
```

Ver la [guía de Edge Functions self-hosted](https://supabase.com/docs/guides/self-hosting/self-hosted-functions) para más detalles.

---

## 9. Acceder a las APIs

Todas las APIs están disponibles a través del mismo API gateway (Kong) en puerto `8000`:

| Servicio | URL |
| ---------- | ----- |
| REST (PostgREST) | `http://<your-domain>:8000/rest/v1/` |
| Auth | `http://<your-domain>:8000/auth/v1/` |
| Storage | `http://<your-domain>:8000/storage/v1/` |
| Realtime | `http://<your-domain>:8000/realtime/v1/` |

---

## 10. Configurar HTTPS

Por defecto, Supabase es accesible via HTTP. Para producción (especialmente con OAuth), necesitás HTTPS con un certificado TLS válido.

**Solución recomendada:** Colocar un reverse proxy (Caddy o Nginx) delante del API gateway.

Ver la [guía de Configure HTTPS](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https) para instrucciones detalladas.

---

## 11. Actualizar Supabase

Se publican releases estables aproximadamente **una vez al mes**.

### Actualizar imágenes

```bash
# Descargar las nuevas imágenes
docker compose pull

# Reiniciar los servicios
docker compose down && docker compose up -d
```

### Actualizar una imagen específica (ejemplo: Studio)

1. Revisar las tags disponibles en [Docker Hub - supabase/studio](https://hub.docker.com/r/supabase/studio/tags)
2. Encontrar la última versión (ej: `2025.11.26-sha-8f096b5`)
3. Editar `docker-compose.yml`:

   ```yaml
   image: supabase/studio:2025.11.26-sha-8f096b5
   ```

4. Correr:

   ```bash
   docker compose pull
   docker compose down && docker compose up -d
   ```

Ver el [changelog de Supabase self-hosted](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md) para seguir los cambios.

---

## 12. Desinstalar

> ⚠️ **PELIGRO:** Los siguientes comandos destruyen todos los datos, incluyendo la base de datos y los volúmenes de storage.

```bash
# Detener contenedores y eliminar volúmenes
docker compose down -v

# Eliminar datos de Postgres
rm -rf volumes/db/data

# Eliminar datos de Storage
rm -rf volumes/storage
```

---

## 13. Temas Avanzados

### Arquitectura de servicios

Supabase está construido sobre herramientas open source:

| Servicio | Descripción |
| ---------- | ------------- |
| **Studio** | Dashboard para administrar el proyecto |
| **Kong** | API gateway |
| **Auth** | API de autenticación JWT |
| **PostgREST** | Convierte Postgres en API REST |
| **Realtime** | Escucha cambios en Postgres y los broadcasts |
| **Storage** | API RESTful para archivos en S3 |
| **imgproxy** | Procesamiento de imágenes rápido y seguro |
| **postgres-meta** | API REST para administrar Postgres |
| **Postgres** | Base de datos relacional principal |
| **Edge Runtime** | Servidor para Edge Functions (Deno) |
| **Logflare** | Plataforma de gestión de logs |
| **Vector** | Pipeline de datos de observabilidad |
| **Supavisor** | Connection pooler para Postgres |

### Cambiar la password de la base de datos

```bash
# Después de la configuración inicial
sh utils/db-passwd.sh

# Reiniciar todos los servicios
docker compose up -d --force-recreate
```

El script genera una nueva password, actualiza todos los roles de la DB y modifica el `.env`.

### Configurar el password inicial de la DB

En `.env`, antes del primer inicio:

```env
POSTGRES_PASSWORD=tu-password-segura-alfanumerica
```

Seguí las [guías de passwords de Postgres](https://supabase.com/docs/guides/database/postgres/roles#passwords). Para evitar problemas de URL encoding, usá solo letras y números.

### Configurar API keys (sistema legacy)

Si seguís usando el sistema de API keys legacy, configurá en `.env`:

| Variable | Descripción |
| ---------- | ------------- |
| `JWT_SECRET` | Usado por Auth, PostgREST, y otros servicios para firmar y verificar JWTs |
| `ANON_KEY` | API key del lado del cliente con permisos limitados (rol `anon`) |
| `SERVICE_ROLE_KEY` | API key del lado del servidor con acceso completo (rol `service_role`) |

### Todos los secrets disponibles

| Secret | Longitud | Generación |
| -------- | ---------- | ------------ |
| `SECRET_KEY_BASE` | min 64 chars | `openssl rand -base64 48` |
| `VAULT_ENC_KEY` | exactamente 32 chars | `openssl rand -hex 16` |
| `PG_META_CRYPTO_KEY` | min 32 chars | `openssl rand -base64 24` |
| `LOGFLARE_PUBLIC_ACCESS_TOKEN` | min 32 chars | `openssl rand -base64 24` |
| `LOGFLARE_PRIVATE_ACCESS_TOKEN` | min 32 chars | `openssl rand -base64 24` |
| `S3_PROTOCOL_ACCESS_KEY_ID` | — | `openssl rand -hex 16` |
| `S3_PROTOCOL_ACCESS_KEY_SECRET` | — | `openssl rand -hex 32` |
| `MINIO_ROOT_PASSWORD` | 8+ chars | `openssl rand -hex 16` |

### Configurar servidor de email (SMTP)

En `.env`:

```env
SMTP_ADMIN_EMAIL=admin@tudominio.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-usuario@gmail.com
SMTP_PASS=tu-password-app
SMTP_SENDER_NAME=Poké Vicio Online
```

Reiniciar todos los servicios para aplicar la configuración. Se recomienda usar **AWS SES** para producción.

### Configurar almacenamiento S3

Por defecto, todos los archivos se guardan localmente. Podés conectar Storage a un backend S3-compatible (AWS S3, RustFS, MinIO, Cloudflare R2).

Ver la [guía de Configure S3 Storage](https://supabase.com/docs/guides/self-hosting/self-hosted-s3).

### Habilitar el AI Assistant de Supabase

Opcional. Agregá tu clave de OpenAI en `.env`:

```env
OPENAI_API_KEY=sk-...
```

### Configurar log_min_messages en Postgres

Por defecto está en `fatal` para evitar logs redundantes de Realtime. Podés cambiarlo en `docker-compose.yml` usando cualquier [Severity Level de Postgres](https://www.postgresql.org/docs/current/runtime-config-logging.html#RUNTIME-CONFIG-SEVERITY-LEVELS).

### Storage en macOS

En macOS, los bind mounts de Docker Desktop tienen limitaciones conocidas (falta de soporte `xattr`, problemas de permisos) que pueden impedir que Storage funcione correctamente. Cambiá el bind mount por un volumen Docker con nombre en `docker-compose.yml`.

---

## 14. Gestión de Secretos

Todos los secretos están en `.env` por defecto. **Para producción, se recomienda fuertemente usar un secrets manager:**

| Herramienta | Link |
| ------------- | ------ |
| **Doppler** | <https://www.doppler.com/> |
| **Infisical** | <https://infisical.com/> |
| **Azure Key Vault** | <https://docs.microsoft.com/azure/key-vault> |
| **AWS Secrets Manager** | <https://aws.amazon.com/secrets-manager/> |
| **GCP Secret Manager** | <https://cloud.google.com/secret-manager> |
| **HashiCorp Vault** | <https://www.hashicorp.com/products/vault> |

---

## 🔗 Links útiles

- 📚 [Documentación oficial - Self-Hosting Docker](https://supabase.com/docs/guides/self-hosting/docker)
- 🔑 [Configurar nuevas API Keys](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys)
- 🔒 [Agregar HTTPS con Reverse Proxy](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https)
- 🌐 [Configurar OAuth Providers](https://supabase.com/docs/guides/self-hosting/self-hosted-oauth)
- 📦 [Configurar S3 Storage](https://supabase.com/docs/guides/self-hosting/self-hosted-s3)
- ⚡ [Edge Functions self-hosted](https://supabase.com/docs/guides/self-hosting/self-hosted-functions)
- 📋 [Changelog](https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md)
- 🐳 [Supabase en Docker Hub](https://hub.docker.com/u/supabase)
