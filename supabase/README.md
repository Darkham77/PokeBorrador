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

## 📘 Documentación

1. [Guía de Instalación](docs/INSTALACION.md)
2. [Despliegue Profesional (VPS)](docs/DESPLIEGUE_SERVIDOR.md)
3. [Manual de Mantenimiento](docs/MANTENIMIENTO.md)

---

**_Poké Vicio - Engine v2.0_**
