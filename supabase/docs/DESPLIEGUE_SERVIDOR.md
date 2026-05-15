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

En entornos NAS o servidores con rutas personalizadas, es vital configurar correctamente el `PROJECT_ROOT` en el archivo `.env`.

### El Problema de los Volúmenes en NAS (Kong)

Docker en entornos NAS tiene un comportamiento específico: si intentas montar un archivo que no existe, Docker creará una **carpeta vacía** con ese nombre. Esto rompe el servicio de Kong.

**Regla de Oro**: Siempre montamos la carpeta completa de configuración en lugar del archivo individual:

- **Correcto**: `- ${PROJECT_ROOT}/config:/etc/kong/declarative:ro`
- **Error**: `- ${PROJECT_ROOT}/config/kong.yml:/var/lib/kong/kong.yml:ro` (Causará fallos en QNAP).

### Sincronización Automática de Roles

El stack incluye un servicio `db-migrator` que se encarga de:

1. Crear los roles de sistema (`supabase_admin`, `authenticator`, etc.) si no existen en la imagen.
2. Sincronizar sus contraseñas con el valor de `POSTGRES_PASSWORD` del `.env`.
3. Reparar los permisos (`GRANT`) automáticamente en cada arranque.

## 3. Configuración de Red

- **Puerto 8000**: API Gateway (Kong). Es el puerto principal de conexión.
- **Puerto 3000**: Panel de control (Supabase Studio).
- **URL Segura**: Asegúrate de que `POSTGRES_PASSWORD` no contenga caracteres especiales (como `@`, `#`, `/`) que puedan romper las URLs de conexión de los servicios.

## 4. Actualización de Esquemas

1. Genera una nueva versión de la imagen con los cambios en `database/schemas`.
2. Sube la imagen y ejecuta `docker-compose up -d` en el servidor. El migrador se encargará del resto.
