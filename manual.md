# Manual de Desarrollo: Pokémon Online (Vue 3 Edition)

Este manual detalla los comandos y configuraciones necesarios para trabajar en la nueva versión del juego usando Vue 3, Vite y Vercel.

## 🛠️ Entorno de Desarrollo

Para iniciar el servidor de desarrollo local:

```powershell
# 1. Instalar dependencias
npm install

# 2. Iniciar Vite
npm run dev
```

El servidor estará disponible en `http://localhost:5173`.

## ☁️ Configuración de Vercel (Backend)

El backend ahora corre en **Vercel Functions**. Para probar las funciones de la carpeta `api/` localmente:

```powershell
# Iniciar Vercel localmente
vercel dev
```

## 🗄️ Base de Datos (Supabase)

Para persistir los datos (eventos, premios, etc.):

1. Creá un proyecto en [Supabase](https://supabase.com).
2. Ejecutá el script [database/schemas/supabase_migration.sql](file:///c:/Users/franc/Trabajo/Juegos/Pokemon-Online/database/schemas/supabase_migration.sql) en el SQL Editor de Supabase.
3. Copiá tus credenciales al archivo `.env` en la raíz del proyecto:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`

## 🚀 Despliegue a Producción

Para preparar y desplegar a Vercel:

```powershell
# Construir para producción
npm run build

# Desplegar (Requiere Vercel CLI)
vercel --prod
```

## 📂 Estructura del Proyecto

- `/src`: Código fuente de la aplicación (Componentes, Stores, Vistas).
- `/public`: Activos estáticos (Assets, Mapas).
- `/api`: Funciones serverless para el backend.
- `/database`: Esquemas SQL y migraciones.
- `/tests`: Suite de pruebas.
- `/docs`: Documentación y reglas del juego.
