# Manual de Mantenimiento y Actualizaciones (Docker-Native)

Como administrador de tu servidor de Poké Vicio, el mantenimiento es **100% automático**.

## 🆙 Actualizar la Base de Datos (Esquemas)

Cuando hay cambios en el esquema del juego, el sistema se encarga de todo. Solo tienes que reiniciar el servidor con el comando de construcción:

```bash
docker-compose up -d --build
```

### ¿Qué sucede detrás de escena?

1. **Docker** construye la nueva imagen de la base de datos con los últimos archivos SQL.
2. El servicio **`db-migrator`** detecta el cambio, espera a que la base de datos esté lista y aplica las nuevas migraciones automáticamente.
3. **Cero comandos manuales**: No necesitas ejecutar scripts de migración por separado.

## 🛡️ Gestión de Administradores

Si necesitas dar permisos de administrador a un nuevo miembro del equipo:

1. Pídele que se registre en el juego.
2. Ejecuta el script de administración con su correo:
   `.\supabase\scripts\set-admin.ps1 -Email correo@miembro.com`

## 🔑 Rotación de Llaves (Seguridad)

Si sospechas que tus llaves han sido filtradas:

1. Genera un nuevo `JWT_SECRET` en tu `.env`.
2. Genera nuevas `ANON_KEY` y `SERVICE_ROLE_KEY`.
3. **IMPORTANTE**: Actualiza el archivo `supabase/config/kong.yml` con las nuevas llaves.
4. Reinicia el servidor: `docker-compose up -d`.

## 💾 Backups (Copias de Seguridad)

...

Para hacer un backup SQL completo de todos los datos de los jugadores:

```bash
docker exec supabase-db-pokevicio pg_dumpall -U postgres > backup_$(date +%F).sql
```

## 🧹 Limpieza Total

Si deseas borrar todo y empezar de cero (borrará todas las cuentas):

```bash
docker-compose down -v
rm -rf volumes/db/data/*
```
