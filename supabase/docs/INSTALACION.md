# Guía de Instalación: Supabase Online

Esta guía te ayudará a poner en marcha el servidor desde cero.

## 📋 Requisitos Previos

- **Docker**: Instalado y corriendo.
- **Docker Compose**: (V2 recomendado).
- **Node.js**: (Opcional, pero recomendado para generar llaves automáticamente).

## 🛠️ Inicio Rápido

Existen dos formas de levantar el servidor:

1. **Modo Desarrollador** (Construcción local):

    ```bash
    docker-compose up -d --build
    ```

2. **Modo Producción** (Uso de imágenes pre-construidas):

    ```bash
    docker-compose -f docker-compose.example.yml up -d
    ```

### 🎨 Acceso al Panel de Control (Studio)

Una vez iniciado, puedes acceder al entorno gráfico de Supabase en:
👉 **`http://localhost:3000`**

Desde aquí puedes ver las tablas, ejecutar SQL y gestionar usuarios visualmente.

## 🛡️ Configuración de Administrador

Para convertir tu cuenta en administradora dentro del juego:

1. Regístrate en el juego con tu email.
2. Ejecuta el script de administración:
   - **Windows**: `.\supabase\scripts\set-admin.ps1 -Email tu@email.com`
   - **Linux**: `./supabase/scripts/set-admin.sh tu@email.com`

## ❓ Solución de Problemas

...

### Los contenedores no inician

- Verifica que los puertos (por defecto 54322 y 8000) no estén siendo usados por otra aplicación.
- Puedes cambiar los puertos en el archivo `.env`.

### Error al conectar desde el juego

- Verifica el estado de los servicios con `docker ps`. Todos los contenedores deben estar en estado `Up`.
- Verifica que el `.env` de la raíz del juego tenga la URL correcta (ej: `http://localhost:8000`).
