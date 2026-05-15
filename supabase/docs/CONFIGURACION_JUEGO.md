# Configuración del Juego: Conexión al Servidor

Una vez que tu servidor Supabase esté corriendo, debes indicarle al juego cómo conectarse a él.

## 🔑 Obtención de Credenciales

Todas las credenciales necesarias se encuentran en el archivo `supabase/.env`.

1. **Supabase URL**: Por defecto es `http://localhost:8000`. Si despliegas esto en un VPS, será la IP o dominio de tu servidor.
2. **Supabase Anon Key**: Busca la línea `ANON_KEY=...` en tu archivo `.env`.
3. **Supabase Service Key**: (Opcional para el cliente, pero útil para scripts de admin) Busca `SERVICE_ROLE_KEY=...`.

## ⚙️ Configuración del Cliente (.env)

En la **raíz del proyecto Poké Vicio** (fuera de la carpeta `supabase`), edita el archivo `.env`:

```env
# Configuración del Servidor Online
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_KEY=tu_anon_key_aqui
```

### 🔄 Cambio de Modo (Online/Offline)

El juego utiliza un `DBRouter` inteligente.

- Si estás en `localhost`, el juego intentará iniciar en modo **Offline** (SQLite) por defecto para desarrollo.
- Para forzar el modo **Online**, asegúrate de que las variables de arriba estén configuradas y el juego detectará el servidor.

## 🌐 Despliegue en Producción

Si deseas que otros jugadores se conecten:

1. Debes abrir los puertos `8000` (API) en tu router/firewall.
2. En el `.env` de la raíz del juego, cambia `localhost` por tu IP pública o dominio.
3. **IMPORTANTE**: En el `.env` de la carpeta `supabase`, asegúrate de que `SITE_URL` coincida con la URL donde alojarás el juego para que el sistema de login (Auth) funcione correctamente.
