# Guía de Despliegue (Docker-Native)

Esta arquitectura está diseñada para ser 100% autocontenida. La base de datos y sus esquemas se empaquetan en una imagen Docker personalizada.

## 1. La Imagen como Artefacto

El servidor se basa en imágenes empaquetadas. El flujo es:

1. **Construir la imagen** (en tu máquina de desarrollo o entorno de compilación).
2. **Subir la imagen** a un registro de contenedores.
3. **Descargar y Correr** en el servidor final.

### Construcción y Publicación Automática

Utiliza los scripts incluidos para automatizar el proceso de empaquetado y subida:

- **Windows**: `.\supabase\scripts\publish-docker.ps1 -User tu-usuario -Repository mi-repo -Tag 0.5.0`
- **Linux**: `./supabase/scripts/publish-docker.sh [tag] [usuario] [repositorio]`

Estos scripts se encargan de:

1. Construir la imagen localmente usando `supabase/Dockerfile.db`.
2. Etiquetarla correctamente con tu usuario de Docker Hub.
3. Subirla al registro oficial.

## 2. Despliegue en el Servidor (Producción / NAS QNAP)

### 🛠️ Reglas de Oro para NAS (Actualizado Mayo 2026)

#### 1. Volúmenes (El problema de la carpeta fantasma)

Docker en NAS crea carpetas vacías si el archivo montado no existe. Para evitarlo:

- **Correcto**: Monta la carpeta completa: `- ${PROJECT_ROOT}/config:/etc/kong/declarative:ro`.
- **Error**: Montar archivos individuales (`kong.yml`) rompe el arranque en QNAP.

#### 2. Permisos y Roles (Postgres 15+)

En versiones modernas, los permisos son restrictivos. El sistema se autogestiona con un `db-migrator` que:

- Otorga `pg_read_server_files` al rol `postgres` para permitir que los scripts internos lean archivos de configuración.
- Crea automáticamente los esquemas obligatorios (`auth`, `storage`, `realtime`, `graphql_public`).
- Nombra a los roles correctos como dueños de cada esquema (`auth` pertenece a `supabase_auth_admin`, etc.).

#### 3. Sincronización de Servicios (Race Conditions)

Para evitar que Auth o PostgREST fallen al arrancar:

- **Dependencias**: Los servicios esperan a que el `db-migrator` finalice con éxito (`service_completed_successfully`).
- Esto garantiza que cuando Auth intente conectar, los permisos y las extensiones (`uuid-ossp`, `pgcrypto`) ya estén listos.

#### 4. Caracteres Especiales

**EVITA** caracteres como `@`, `:`, `/` o `#` en `POSTGRES_PASSWORD`. Rompen las URLs de conexión interna de Elixir (Realtime) y PostgREST.

---

## 🔒 Generación de Seguridad

No utilices valores aleatorios simples para las llaves de API. Deben ser tokens JWT válidos firmados con tu `JWT_SECRET`.

### 1. Generar JWT_SECRET (Llave Maestra)

Usa OpenSSL para generar una cadena aleatoria fuerte:

```bash
openssl rand -base64 32
```

### 2. Generar ANON_KEY y SERVICE_ROLE_KEY

Ejecuta estos comandos en tu terminal (reemplazando `TU_SECRET` por el resultado del paso anterior):

**Para ANON_KEY:**

```bash
node -e "const s='TU_SECRET'; const p=Buffer.from(JSON.stringify({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000)})).toString('base64url'); const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'); console.log(h+'.'+p+'.'+require('crypto').createHmac('sha256',s).update(h+'.'+p).digest('base64url'))"
```

**Para SERVICE_ROLE_KEY:**

```bash
node -e "const s='TU_SECRET'; const p=Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000)})).toString('base64url'); const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'); console.log(h+'.'+p+'.'+require('crypto').createHmac('sha256',s).update(h+'.'+p).digest('base64url'))"
```

---

## 🚀 Guía de Arranque Rápido

1. Asegúrate de que el `.env` tiene las claves generadas en el paso anterior.
2. Ejecuta `docker-compose up -d`.
3. Monitoriza el migrador: `docker logs -f supabase-db-migrator-pokevicio`.
4. Solo cuando veas el check de éxito (`✅`), los demás servicios serán visibles.
