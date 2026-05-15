# Poké Vicio - Servidor Online (Docker-Native)

Este directorio contiene la infraestructura para desplegar un servidor de Supabase empaquetado específicamente para Poké Vicio.

## 🚀 Inicio Rápido

1. **Levantar el Servidor**:

   ```bash
   docker-compose up -d --build
   ```

   _Este comando construye la imagen de la base de datos y activa la infraestructura automáticamente._

2. **Verificar Estado**:

   ```bash
   docker ps
   ```

## 🛡️ Arquitectura de Imagen Autocontenida

Este sistema utiliza un **Dockerfile** para integrar las migraciones dentro del contenedor de Postgres.

- **Portabilidad**: La imagen de la DB es un artefacto independiente.
- **Cero Dependencias**: El servidor no necesita acceso a las carpetas de código fuente una vez desplegado.
- **Seguridad**: Los esquemas están protegidos dentro de la capa de la imagen.

## 📦 Publicación de Imágenes (CI/CD)

Si deseas subir tu propia versión de la base de datos a un registro como Docker Hub, utiliza los scripts incluidos:

- **Windows (PowerShell)**: `.\scripts\publish-docker.ps1 -User tu-usuario -Tag 0.5.0`
- **Linux/macOS (Bash)**: `./scripts/publish-docker.sh [tag] [usuario]`

## 🛠️ Configuración de Ejemplo

Para usuarios que desean desplegar el servidor sin construir las imágenes localmente, se proporciona `docker-compose.example.yml`. Este archivo ya viene pre-configurado con los puertos y parámetros actuales del proyecto.

Para usarlo:

1. Copia el archivo: `cp docker-compose.example.yml docker-compose.prod.yml`
2. Ajusta las variables de entorno si es necesario.
3. Levanta el stack: `docker-compose -f docker-compose.prod.yml up -d`

---

**_Poké Vicio - Engine v2.0_**
