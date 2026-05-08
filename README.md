# Manual de Desarrollo: Pokémon Online (Vue 3 + Phaser 4)

Este manual detalla los comandos y configuraciones necesarios para trabajar en la nueva versión del juego usando **Vue 3**, **Phaser 4**, **Vite** y **Supabase**.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado **Node.js (v26.0.0 o superior)** en tu sistema.

> [!IMPORTANT]
> El proyecto utiliza características modernas del motor V8 y requiere explícitamente Node 26+. Si tu versión es inferior, el comando `npm install` lanzará una advertencia sugiriendo la actualización.

### 🌐 Instalación de Node.js y NPM

- **Windows (Terminal/PowerShell)**:

    ```bash
    winget install OpenJS.NodeJS
    ```

- **Linux (Ubuntu/Debian)**:

     Para asegurar que instalas la versión 26+ (los repositorios de apt suelen estar desactualizados), usa NodeSource:

     ```bash
     curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
     sudo apt install -y nodejs
     ```

- **Actualizar NPM** (Opcional):

    ```bash
    npm install -g npm@latest
    ```

## 🛠️ Entorno de Desarrollo

Para iniciar el servidor de desarrollo local:

1. **Instalar dependencias**:

    ```bash
    npm install
    ```

2. **Actualizar dependencias** (Si hay nuevas versiones o warnings de seguridad):

    ```bash
    npm update
    ```

3. **Configurar Variables de Entorno**:
    Copia el archivo `.env.example` y renómbralo a `.env`, luego completa los valores de Supabase:

    ```bash
    cp .env.example .env
    ```

4. **Iniciar Vite**:

    ```bash
    npm run dev
    ```

El servidor estará disponible en `http://localhost:5173`.

## 🗄️ Base de Datos (Supabase)

### Inicialización

Para inicializar las tablas necesarias la primera vez:

1. Ejecutá el script [database/schemas/supabase_migration.sql](file:///home/franco/Trabajos/PokeBorrador/database/schemas/supabase_migration.sql) en el SQL Editor de Supabase.

### Actualizaciones y Migraciones

Cuando se añadan nuevas funcionalidades o cambios en los esquemas:

1. **Identificar cambios**: Revisa la carpeta `database/schemas/` por nuevos archivos `.sql`.
2. **Ejecución**: Copia el contenido de los nuevos archivos y ejecútalos en el **SQL Editor** de Supabase.
3. **Lógica de Servidor**: Si se modifican archivos como `db_trade_rpc.sql` o `db_security_triggers.sql`, asegúrate de ejecutarlos para actualizar las funciones RPC y triggers.

## 🚀 Despliegue (Hosting)

### Vercel (Recomendado Fullstack)

Vercel es la opción ideal ya que soporta automáticamente las funciones de la carpeta `/api`.

1. **Dashboard**: Conecta tu repositorio de GitHub en [vercel.com](https://vercel.com).
2. **Variables de Entorno**: En los ajustes del proyecto, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY`.
3. **Despliegue**: Vercel detectará Vite automáticamente. Cada `git push` a `main` actualizará el sitio.

### GitHub Pages (Solo Frontend)

Si solo deseas hostear el cliente estático:

1. **Configurar Base**: En `vite.config.js`, agrega `base: '/PokeBorrador/'` (o el nombre de tu repo).
2. **GitHub Actions**: Utiliza un workflow (ej. `.github/workflows/deploy.yml`) para automatizar el build.
3. **Secrets**: Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en `Settings > Secrets > Actions`.

## ☁️ Configuración Local de Funciones (Vercel CLI)

Para probar las funciones de la carpeta `api/` localmente:

```bash
vercel dev
```

El desarrollo de este proyecto se rige por un sistema de reglas estrictas gestionadas por IA a través de Antigravity. Estas reglas están formalizadas en:

- **[AGENTS.md](./AGENTS.md)**: El contrato maestro del proyecto (Nativo).
- **Skill @/project-standards**: El motor de razonamiento técnico.

Antes de realizar una entrega o desplegar cambios, es **MANDATORIO** que el código pase los siguientes controles:

1. **Type-checking**: Verificación de integridad de tipos TypeScript (cero errores permitidos).
2. **Linting**: El código debe estar libre de errores de sintaxis y seguir el estilo del proyecto.
3. **Database Validation**: Es obligatorio validar las migraciones SQL contra el motor local antes de cualquier commit de base de datos.
4. **Testing**: Todos los unit tests deben pasar exitosamente.
5. **Build**: La aplicación debe compilar correctamente para producción.

```bash
npm run type-check
npm run validate-sql
npm run lint
npm run test
npm run build
```

### Reglas de Oro

- **Eficiencia GPU**: Usa siempre Texture Atlases y Object Pooling en Phaser.
- **Assets WebP**: Prohibido usar PNG/JPG raw; usa el script de conversión a WebP. (Excepción: Assets de PokeAPI deben ser PNG).
- **Ley de 500 Líneas**: Ningún archivo de lógica o componente debe exceder las 500 líneas.
- **Aislamiento de Servidores**: No mezcles datos de instancias Global (Supabase) con Local (SQLite).

---

## 📦 Gestión de Assets y Utilidades

El proyecto utiliza herramientas nativas para procesar recursos de forma segura y eficiente.

### 📥 Descarga de Sprites y Recursos

Usa el script unificado para obtener assets externos:

```bash
# Descarga completa (Pokemon Gen 1-2, Items, Trainers)
npm run download-assets

# Descarga selectiva (recomendado para ahorrar tiempo)
npm run download-assets -- --pokemon    # Solo Pokémon (Front/Back/Shiny)
npm run download-assets -- --items      # Solo ítems
npm run download-assets -- --trainers   # Solo entrenadores
```

### 🖼️ Pipeline de Assets

Procesa todas las imágenes de `_raw-assets`, las convierte a WebP y las espeja en la estructura del proyecto:

```bash
npm run convert-assets
```

### 🔎 Auditoría de Estándares

Motor unificado para verificar Viewports dinámicos, filtros SASS, rendimiento GPU y reglas de código:

```bash
# Solo escaneo
npm run audit

# Escaneo y corrección automática (Viewport, SASS filters, imports)
npm run audit:fix
```

### 🔒 Ejecución Segura

Los scripts de utilidad requieren permisos explícitos. Si creas nuevos scripts, asegúrate de invocar Node con el modelo de permisos:

```bash
node --permission --allow-fs-read=. --allow-fs-write=. scripts/tu_script.ts
```

---

## 📂 Estructura del Proyecto

- `/src`: Código fuente de la aplicación (Componentes, Stores, Vistas).
- `/public`: Activos estáticos (Assets, Mapas).
- `/api`: Funciones serverless para el backend.
- `/database`: Esquemas SQL y migraciones.
- `/tests`: Suite de pruebas (Vitest).
- `/docs`: Documentación técnica y reglas del juego.

---

## 📖 Tutoriales y Tips del Proyecto

### 1. 🛠️ Solución a errores de `npm run dev`

Si bajas cambios del repositorio (git pull) y el comando `npm run dev` falla o tira errores inesperados, generalmente es porque se instalaron nuevas librerías que no tienes en tu entorno local.

- **Solución**: Ejecutá `npm install` para sincronizar las dependencias.
- **Tip**: Se recomienda ejecutar periódicamente `npm update` para mantener todas las librerías actualizadas.

### 2. 🛡️ Auditoría de Estándares

Para mantener la calidad y el orden del código, es una excelente práctica realizar una auditoría periódica (cada 2 o 3 días de trabajo).

- **Instrucción**: Pedile a la IA: *"Hace una auditoría a todo el proyecto y revisá que cumpla con /project-standards"*.
- **Resultado**: La IA detectará archivos que exceden las 500 líneas, errores de estilo o violaciones a la arquitectura.
- **Acción**: Después del reporte, pedile que genere el *"plan de corrección"* para normalizar el código.

### 3. 🖼️ Gestión de Imágenes (`_raw-assets`)

El proyecto usa un sistema de espejado para optimizar imágenes automáticamente a WebP y generar diferentes niveles de detalle (LOD).

- **Ubicación**:
  - `_raw-assets/lod/`: Imágenes que requieren múltiples tamaños (ej. mapas). Genera `@1x`, `@0.5x`, `@0.25x`.
  - `_raw-assets/original/`: Imágenes que solo necesitan conversión a WebP 1:1 (ej. sprites).
- **Mirroring**: La estructura dentro de `_raw-assets` debe ser idéntica a la del proyecto (ej: `_raw-assets/lod/public/assets/maps/` se volcará en `public/assets/maps/`).
- **Compilación**: Para procesar nuevas imágenes, pedile a la IA: *"recompila las imágenes"*. El script aplicará **Smart Scaling**:
  - **< 500px**: Mantiene 100% de calidad en todos los niveles (LODs) para evitar que avatares o iconos se vean borrosos.
  - **> 1000px**: Genera versiones reducidas al 50% y 25% para optimizar carga en móviles.
- **Atlas de Phaser**: Si creas una carpeta que termine en `.atlas` (ej: `vfx.atlas/`), el script la compilará automáticamente en un Texture Atlas (JSON + WebP) para el motor de juego.

### 4. ✨ Renderizado: Pixelated vs Smooth

Por identidad visual, el "corazón" del juego es pixelado, pero el "shell" (la interfaz exterior) es moderno.

- **Por defecto**: Todos los assets se tratan como pixelados.
- **Tipografía (Corazón)**: Nombres de Pokémon, Stats, Diálogos y Títulos de Modales **DEBEN** usar fuentes pixeladas (`Press Start 2P`, `VT323`) y el mixin `@include pixelated;` para evitar suavizados borrosos del navegador.
- **Tipografía (Shell)**: Menús de configuración, logs técnicos y créditos pueden usar fuentes suaves (`Outfit`, `Inter`).
- **Especificación**: Si necesitás asegurar que algo se vea pixel-perfect, usá el mixin `@include pixelated;` en el SCSS.
- **Excepciones**: Para logos premium o elementos que deban verse suaves, usá `@include smooth;` (esto aplica `image-rendering: auto`).

### 5. ⚠️ Precaución al actualizar Skills

Cuando la IA actualiza una Skill (archivos `.md` en `.agents/skills/`):

- **SIEMPRE LEELA**: A veces la IA tiene la mala costumbre de borrar secciones antiguas o útiles por error al reescribir.
- **Revisión**: Mirá los cambios (los bloques rojos del diff) antes de confirmar que el cambio es correcto.

### 6. 🔍 Debugging de Texturas (Phaser)

Para verificar qué imágenes están cargadas en el motor de juego:

- **Inspección**: Abrí la consola (`F12`) y escribí `phaserBridge.game.textures.list`.
- **Atlas**: Para ver qué hay dentro de un atlas: `Object.keys(phaserBridge.game.textures.get('vfx').frames)`.
- **LOD Check**: Para ver si cargó la versión optimizada: `phaserBridge.game.textures.get('vfx').source[0].image.src`.

### 7. 🛡️ Sistema de Seguridad y Moderación (Baneos)

El proyecto incluye un sistema de protección automática (**"Ban Trap"**) para prevenir el uso indebido de herramientas de desarrollo en entornos de producción.

- **Detección Automática**: Si un usuario con rol de `user` intenta invocar métodos de la API de depuración (`window.__VITE_DEBUG__`) o interactuar con el panel de desarrollo en modo **ONLINE**, el sistema:
    1. Marca la cuenta como baneada (`is_banned: true`) en la base de datos.
    2. Registra el motivo del baneo.
    3. Fuerza el cierre inmediato de la sesión.
- **Efecto Visual**: El usuario afectado verá una pantalla de **ACCESO DENEGADO** con estética retro-moderna al intentar iniciar sesión, indicando el motivo de la sanción.
- **Restauración de Cuentas**: El baneo es permanente hasta que un administrador lo revierta manualmente desde el panel de control de Supabase.
  - **Pasos para desbanear**:
    1. Entrá al SQL Editor de Supabase.
    2. Ejecutá la siguiente consulta:

    ```sql
    UPDATE profiles 
    SET is_banned = false, ban_reason = NULL 
    WHERE email = 'usuario@ejemplo.com';
    ```

- **Modo Local**: En modo `offline` (localhost), el sistema de baneo está deshabilitado para permitir el testing sin riesgos.

### 8. 🛡️ Mantenimiento de Usuarios (Admin SQL)

Comandos frecuentes para realizar mantenimiento manual sobre la base de datos de producción (Online).

#### Cambiar Contraseña de un Usuario

Para resetear la contraseña manualmente desde el SQL Editor:

```sql
UPDATE auth.users 
SET encrypted_password = crypt('NUEVA_CONTRASEÑA', gen_salt('bf')) 
WHERE email = 'usuario@ejemplo.com';
```

#### Cambiar Email de un Usuario

Se debe actualizar tanto en la tabla de autenticación como en el perfil público para mantener la consistencia:

```sql
-- 1. Actualizar Auth (Requerido para login)
UPDATE auth.users 
SET email = 'nuevo@email.com', 
    email_confirmed_at = NOW() 
WHERE email = 'viejo@email.com';

-- 2. Actualizar Perfil (Requerido para lógica de juego)
UPDATE public.profiles 
SET email = 'nuevo@email.com' 
WHERE email = 'viejo@email.com';
```

#### Cambiar Nombre de Entrenador (Username)

```sql
UPDATE public.profiles 
SET username = 'NuevoNombre' 
WHERE email = 'usuario@ejemplo.com';
```

#### Promoción a Administrador (ADMIN Role)

Para otorgar permisos de administrador a un usuario (acceso a paneles de debug en producción, bypass de ban-traps, etc.):

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'usuario@ejemplo.com';
```

> [!IMPORTANT]
> Los nombres de usuario deben ser únicos. Si el nombre ya existe, la consulta fallará debido a la restricción `UNIQUE`.
