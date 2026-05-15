# Configuración del Juego: Conexión al Servidor

Una vez que tu servidor Supabase esté corriendo, debes indicarle al juego cómo conectarse a él.

## 🔑 Obtención de Credenciales

Todas las credenciales necesarias se encuentran en el archivo `supabase/.env`.

1. **Supabase URL**: Por defecto es `http://localhost:8000`. Si despliegas esto en un VPS, será la IP o dominio de tu servidor.
2. **Supabase Anon Key**: Busca la línea `ANON_KEY=...` en tu archivo `.env`.
3. **Supabase Service Key**: (Opcional para el cliente, pero útil para scripts de admin) Busca `SERVICE_ROLE_KEY=...`.

## ⚙️ Configuración del Cliente (.env)

En la **raíz del proyecto Poké Vicio**, edita el archivo `.env`. Puedes usar el `.env.example` unificado de la raíz como plantilla, ya que contiene todas las variables del servidor y del cliente en un solo lugar.

### ⚠️ Importante: Sincronización con Kong

Si cambias la `ANON_KEY` o la `SERVICE_ROLE_KEY` en tu archivo `.env`, debes asegurarte de que también estén actualizadas en:
👉 `supabase/config/kong.yml`

Si no coinciden, Kong rechazará todas las peticiones del juego por seguridad.

## 🎨 Gestión Visual (Supabase Studio)

Para administrar tu base de datos (ver perfiles, editar estadísticas de jugadores, etc.), puedes entrar al panel gráfico en:
👉 **`http://localhost:3000`**

Recuerda que para darte permisos de administrador en el juego, después de registrarte debes ejecutar el script:
`.\supabase\scripts\set-admin.ps1 -Email tu@email.com`
