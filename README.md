# Manual de Desarrollo: Poké Vicio (Vue 3 + Vite + Supabase)

Este manual detalla los comandos y configuraciones necesarios para trabajar en la versión moderna del juego usando **Vue 3**, **Vite** y **Supabase**. El motor de juego ha sido migrado íntegramente a Vue para máxima reactividad y rendimiento.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado **Node.js (v26.0.0 o superior)** en tu sistema.

> [!IMPORTANT] El proyecto utiliza características modernas del motor V8 y requiere explícitamente Node 26+. Si tu versión es inferior, el comando `npm ci` (o `npm install`) lanzará una advertencia sugiriendo la actualización.

### 🌐 Instalación de Node.js y NPM

#### Opción A: Usando NVM (Recomendado)

[NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) permite gestionar múltiples versiones de Node.js y es la forma más limpia de mantener el entorno actualizado sin conflictos de permisos.

1. **Instalar NVM**:
   - **Linux/macOS**:

     ```bash
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
     ```

   - **Windows**: Descarga e instala [nvm-windows](https://github.com/coreybutler/nvm-windows/releases).

2. **Instalar y usar Node 26**:

   ```bash
   nvm install 26
   nvm use 26
   nvm alias default 26
   ```

3. **Actualizar Node.js**: Para actualizar a la última versión de la rama 26 y migrar tus paquetes globales:

   ```bash
   nvm install 26 --reinstall-packages-from=current
   ```

#### Opción B: Instalación Directa

- **Windows (Terminal/PowerShell)**:

  ```bash
  winget install OpenJS.NodeJS
  ```

- **Linux (Ubuntu/Debian)**: Para asegurar que instalas la versión 26+ (los repositorios de apt suelen estar desactualizados), usa NodeSource:

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

- **Actualizar NPM** (Opcional):

  ```bash
  npm install -g npm@latest
  ```

## 🛠️ Entorno de Desarrollo

### 🛡️ Configuración de Seguridad de NPM (Recomendado)

Para mitigar riesgos como ataques de cadena de suministro (*supply chain attacks*), inyección de malware o ejecución de scripts maliciosos, debes modificar la configuración global de Node Package Manager ejecutando los siguientes comandos en tu terminal:

```bash
# 1. Desactivar la ejecución automática de scripts (Pre/Post install)
# Esto evita que un paquete malicioso ejecute código en tu máquina al instalar paquetes
npm config set ignore-scripts true

# 2. Forzar el uso de HTTPS para todo el registro
npm config set registry https://registry.npmjs.org/

# 3. Requerir obligatoriamente firmas de paquetes válidas
npm config set audit-level high
```

>[!NOTE]
> **Nota sobre `ignore-scripts`**: Al activar esto, algunos paquetes legítimos que compilan binarios nativos (como `node-gyp` o herramientas de profiling) podrían fallar al instalarse. Si confías plenamente en un paquete específico y necesitas ejecutar sus scripts de compilación, puedes compilarlo manualmente usando `npm rebuild` o ejecutándolo de forma aislada una única vez con `npm run <script> --ignore-scripts=false`.

### 🚀 Pasos para Iniciar el Servidor Local

El archivo `package-lock.json` es tu barrera de seguridad más crítica porque almacena los hashes criptográficos (integrity SHA-512) de cada paquete.

>[!IMPORTANT]
> **Regla estricta**: En entornos de desarrollo, CI/CD o producción, nunca uses `npm install` a secas si quieres garantizar una reproducibilidad segura. Usa siempre `npm ci`.

Sigue estos pasos para configurar e iniciar tu entorno de desarrollo:

1. **Instalar dependencias**:

   ```bash
   npm ci
   ```

2. **Actualizar dependencias** (Si hay nuevas versiones o warnings de seguridad):

   ```bash
   npm update
   ```

3. **Configurar Variables de Entorno**: Copia el archivo `.env.example` y renómbralo a `.env`, luego completa los valores de Supabase:

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

1. Ejecutá el script [database/schemas/supabase_migration.sql](./database/schemas/supabase_migration.sql) en el SQL Editor de Supabase.

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

### 🛡️ Auditoría e Integridad (Node.js 26+)

El proyecto utiliza un motor de auditoría inteligente y validadores semánticos para garantizar la calidad del código.

| Comando | Descripción |
| :-- | :-- |
| `npm run audit` | **Auditoría Inteligente**: Analiza patrones legacy (Date), colisiones SASS y optimización GPU. |
| `npm run audit:fix` | **Auto-corrección**: Aplica correcciones automáticas de estándares (Timers, Imports, SASS). |
| `npm run audit:summary` | **Resumen de Auditoría**: Ejecuta la auditoría en modo resumen (oculta detalles de violaciones). |
| `npm run audit:report` | **Reporte de Auditoría**: Genera un archivo detallado `scratch/audit_report.txt` con todas las violaciones. |
| `npm run audit:full` | **Pipeline Completo**: Ejecuta TODAS las validaciones (Lints, SQL, FSM, Items, Moves, Abilities). |
| `npm run test:node` | **Native Test Runner**: Ejecuta pruebas de lógica pura usando el runner nativo de Node.js 26+. |
| `npm run test:all` | **Batería Completa de Tests**: Ejecuta secuencialmente la suite nativa de Node.js (`test:node`) y los tests de componentes en Vitest (`test`). |
| `npm run validate:sql` | **SQL Integrity**: Valida compatibilidad de migraciones con SQLite nativo (`node:sqlite`). |
| `npm run validate:items` | **Item Database**: Verifica IDs, tipos e iconos en la base de datos de objetos. |
| `npm run validate:items:summary` | **Resumen de Objetos**: Valida los objetos omitiendo listados detallados en consola. |
| `npm run validate:items:report` | **Reporte de Objetos**: Genera un archivo detallado `scratch/items_report.txt` con la validación de objetos. |
| `npm run validate:moves` | **Move Integrity**: Valida integridad de movimientos y learnsets contra el Dex de Showdown. |
| `npm run validate:moves:summary` | **Resumen de Movimientos**: Valida movimientos omitiendo listados detallados en consola. |
| `npm run validate:moves:report` | **Reporte de Movimientos**: Genera un archivo detallado `scratch/moves_report.txt` con la validación de movimientos. |
| `npm run validate:abilities` | **Ability Sync**: Valida habilidades contra la base de datos oficial. |
| `npm run validate:abilities:summary` | **Resumen de Habilidades**: Valida habilidades omitiendo listados detallados en consola. |
| `npm run validate:abilities:report` | **Reporte de Habilidades**: Genera un archivo detallado `scratch/abilities_report.txt` con la validación de habilidades. |
| `npm run validate:sandbox` | **Sandbox Validate**: Valida los tooltips de movimientos en el sandbox de batalla. |
| `npm run validate:sandbox:summary` | **Resumen de Sandbox**: Valida el sandbox omitiendo listados detallados en consola. |
| `npm run validate:sandbox:report` | **Reporte de Sandbox**: Genera un archivo detallado `scratch/sandbox_report.txt` con la validación de sandbox. |
| `npm run validate:fsm` | **FSM Mastery Audit**: Verifica diagramas, implementación dinámica y paridad de flujo. |
| `npm run validate:fsm:summary` | **Resumen de FSM**: Valida la FSM omitiendo listados detallados en consola. |
| `npm run validate:fsm:report` | **Reporte de FSM**: Genera un archivo detallado `scratch/fsm_report.txt` con la validación de FSM. |
| `npm run migrations:generate` | **Generador de Migraciones**: Escanea las migraciones SQL locales de `database/migrations/` y las compila en el manifiesto TypeScript de producción. |
| `npm run sync:test` | **Sincronización a Repo de Testing**: Copia el árbol de fuentes completo (`src/`, `api/`, `public/`, `scripts/`, `database/migrations/`, archivos de config) desde `PokeBorrador` al repositorio hermano `pokevicio-test`. Si `pokevicio-test` no existe, lo clona automáticamente vía SSH. Preserva `.git` y `.github` intactos. Usarlo cuando una rama de feature está estable y se quiere enviar un snapshot limpio para QA. |

### ☁️ Gestión de Infraestructura Supabase y Servidores (Node.js 26+)

El proyecto cuenta con un conjunto de herramientas automatizadas para gestionar el ciclo de vida de las bases de datos y la configuración de múltiples servidores (Cloud, NAS) a partir del archivo `.env` maestro unificado.

| Comando | Descripción |
| :-- | :-- |
| `npm run servers:configure` | **Sincronización de GUI**: Parsea el `.env` maestro, extrae perfiles (`SERVER_<profile>_*`) y genera `src/data/official_servers.ts`. |
| `npm run servers:db:update` | **Gestor y Migrador**: Conecta a la instancia elegida (`--server=<perfil>` o `--all`), inicializa esquemas y aplica parches incrementales. |
| `npm run servers:db:backup` | **Generador de Respaldos**: Conecta al servidor elegido (`--server=<perfil>`), descubre tablas dinámicamente y descarga un respaldo JSON. |
| `npm run servers:db:restore` | **Restaurador Transaccional**: Limpia en orden inverso y restaura transaccionalmente un archivo JSON hacia el servidor elegido (`--server=<perfil>`). |
| `npm run servers:db:local-import` | **Importador SQLite Local**: Importa el respaldo JSON más reciente de Supabase hacia la base de datos local SQLite para pruebas offline. |
| `npm run servers:db:admin` | **Mantenimiento de Usuarios**: Permite desbanear, cambiar contraseñas, emails, usernames y promover a admin desde la CLI. |
| `npm run supabase:manage` | **Gestión de Docker/CLI**: Orquestador central de Supabase en local/Docker. Permite clonar, generar configuraciones unificadas y compilar/publicar la imagen local `pokevicio-db`. |
| `npm run admin:rename` | **Renombrado Administrativo**: Cambia el nombre de entrenador de un usuario en Supabase directamente desde consola por ID o por el nombre actual. |

#### Ejemplos de Uso de Infraestructura

```bash
# 1. Sincronizar servidores en la interfaz del juego
npm run servers:configure

# 2. Inicializar o actualizar base de datos en un servidor específico
npm run servers:db:update -- --server=nas_franco

# 3. Actualizar base de datos en TODOS los servidores configurados en el .env
npm run servers:db:update -- --all

# 4. Descargar un respaldo completo en formato JSON de un servidor
npm run servers:db:backup -- --server=nas_franco

# 5. Restaurar el respaldo más reciente de forma automática a un servidor
npm run servers:db:restore -- --server=nas_franco

# 6. Restaurar un respaldo específico pasándole la ruta exacta del archivo
npm run servers:db:restore -- --server=nas_franco --file=database/backups/nas-franco/nas_franco_backup_2026-05-17T05-29-09.json
```

#### 🌐 Resolución de Problemas de Red (MikroTik & Hairpin NAT)

Si experimentas problemas de conectividad externa o timeouts al conectarte al Supabase del NAS desde fuera de tu red local, consulta el manual detallado en [supabase_infrastructure_manual.md](./.agents/skills/project-standards/references/technical/supabase_infrastructure_manual.md).

Resumen de comandos MikroTik (Winbox / SSH) para resolver caídas de ruteo asimétrico:

1. **Parche Quirúrgico de Mangle (Evita la exclusión del balanceador):**

   ```routeros
   /ip firewall mangle add chain=prerouting action=mark-routing new-routing-mark=to_ISP_1_franco passthrough=no src-address=192.168.88.200 src-port=8443 protocol=tcp connection-mark=ISP1-input comment="Parche Quirurgico - Supabase WAN1 Reply" place-before=[Excluir Router index]
   ```

2. **Reglas de Ruteo en RouterOS v7 (Asociación del FIB):**

   ```routeros
   /routing rule add routing-mark=to_ISP_1_franco action=lookup table=to_ISP_1_franco
   /routing rule add routing-mark=to_ISP_2_omar action=lookup table=to_ISP_2_omar
   ```

3. **Bypass del Firewall del NAS (Hairpin NAT Universal):** Remueve el filtro de `src-address` en tu regla de Hairpin NAT para masqueradear todas las conexiones entrantes (locales y externas) con la IP del router (`192.168.88.1`), forzando al NAS a aceptar y responder correctamente.

### Otros Comandos de Desarrollo

```bash
npm run dev               # Inicia el entorno de desarrollo (Vite)
npm run validate:types         # Verificación estricta de tipos TypeScript
npm run test               # Unit tests de UI y componentes (Vitest)
npm run build              # Compilación para producción
npm run assets:download    # Descarga sprites y recursos externos (Gen 1-9, Items, Trainers)
npm run sync:test          # Sincroniza el código fuente al repo hermano pokevicio-test para QA
```

### Reglas de Oro

- **Rendimiento GPU**: Prioriza el uso de transformaciones CSS3 (`translate3d`), capas GPU y evita filtros costosos en bucles de animación.
- **Assets WebP**: Prohibido usar PNG/JPG raw; usa el script de conversión a WebP. (Excepción: Assets de PokeAPI deben ser PNG).
- **Ley de 500 Líneas**: Ningún archivo de lógica o componente debe exceder las 500 líneas.
- **Aislamiento de Servidores**: No mezcles datos de instancias Global (Supabase) con Local (SQLite).

---

## 📦 Gestión de Assets y Utilidades

El proyecto utiliza herramientas nativas para procesar recursos de forma segura y eficiente.

### 📥 Descarga de Sprites y Recursos

Usa el script unificado para obtener assets externos:

```bash
# Descarga completa (Pokemon Gen 1-9, Items, Trainers)
npm run assets:download

# Descarga selectiva o limitada (Usar -- para pasar flags)
npm run assets:download -- --limit=151  # Solo primera generación
npm run assets:download -- --pokemon    # Solo Pokémon (Front/Back/Shiny)
npm run assets:download -- --items      # Solo ítems
npm run assets:download -- --trainers   # Solo entrenadores
npm run assets:download -- --showdown   # Solo Pokémon de Showdown (Front/Back/Shiny, Cries)
```

> [!NOTE] Los recursos se descargan en la carpeta `external_assets/`. Estos archivos están fuera del pipeline automático de `_raw-assets` por defecto para evitar duplicación masiva, pero podés moverlos manualmente si necesitás procesarlos.

### 🖼️ Pipeline de Assets

Procesa todas las imágenes de `_raw-assets`, las convierte a WebP y las espeja en la estructura del proyecto:

```bash
npm run assets:convert
```

> [!TIP] El script detecta automáticamente si un asset es Pixel Art (basado en carpetas como `sprites/` o `icons/`) para aplicar compresión **Lossless**. Para el resto, aplica una calidad adaptativa basada en la resolución.

### 🔎 Auditoría de Estándares

Motor unificado para verificar Viewports dinámicos, filtros SASS, rendimiento GPU y reglas de código:

```bash
# Solo escaneo de Viewports/SASS
npm run audit

# Auditoría completa (FSM, ítems, habilidades, movimientos, SQL)
npm run audit:full

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

- **Solución**: Ejecutá `npm ci` para sincronizar las dependencias de forma segura (evitando el uso de `npm install`).
- **Tip**: Se recomienda ejecutar periódicamente `npm update` para mantener todas las librerías actualizadas.

### 2. 🛡️ Auditoría de Estándares

Para mantener la calidad y el orden del código, es una excelente práctica realizar una auditoría periódica (cada 2 o 3 días de trabajo).

- **Instrucción**: Pedile a la IA: *"Hace una auditoría a todo el proyecto y revisá que cumpla con /project-standards"*.
- **Resultado**: La IA detectará archivos que exceden las 500 líneas, errores de estilo o violaciones a la arquitectura.
- **Acción**: Después del reporte, pedile que genere el *"plan de corrección"* para normalizar el código.

### 3. 🖼️ Gestión de Imágenes (`_raw-assets`)

El proyecto usa un sistema de espejado (mirroring) para optimizar imágenes automáticamente a WebP sin intervención manual pesada.

- **Ubicación**: Coloca tus assets originales en `_raw-assets/`. La estructura debe ser idéntica a la del proyecto (ej: `_raw-assets/public/assets/maps/`).
- **Compilación**: Ejecutá `npm run assets:convert`. El script procesará todo:
  - **Conversión**: Todo se transforma a `.webp`.
  - **Pixel Art Safety**: Si el archivo está en carpetas de `sprites`, `icons`, `badges` o `items`, se usa **Lossless** para mantener la nitidez.
  - **Smart Quality**: Para imágenes grandes (> 250px), aplica una ligera compresión lossy para optimizar la carga inicial.
- **Mirroring**: El resultado se volcará directamente en la carpeta correspondiente del proyecto (ej: de `_raw-assets/public/...` a `public/...`).

### 4. ✨ Renderizado: Pixelated vs Smooth

Por identidad visual, el "corazón" del juego es pixelado, pero el "shell" (la interfaz exterior) es moderno.

- **Por defecto**: Todos los assets se tratan como pixelados.
- **Tipografía (Corazón)**: Nombres de Pokémon, Stats, Diálogos y Títulos de Modales **DEBEN** usar fuentes pixeladas (`Pokemon FireRed LeafGreen`, `VT323`) y el mixin `@include pixelated;` para evitar suavizados borrosos del navegador.
- **Tipografía (Shell)**: Menús de configuración, logs técnicos y créditos pueden usar fuentes suaves (`Outfit`, `Inter`).
- **Especificación**: Si necesitás asegurar que algo se vea pixel-perfect, usá el mixin `@include pixelated;` en el SCSS.
- **Excepciones**: Para logos premium o elementos que deban verse suaves, usá `@include smooth;` (esto aplica `image-rendering: auto`).

### 5. ⚠️ Precaución al actualizar Skills

Cuando la IA actualiza una Skill (archivos `.md` en `.agents/skills/`):

- **SIEMPRE LEELA**: A veces la IA tiene la mala costumbre de borrar secciones antiguas o útiles por error al reescribir.
- **Revisión**: Mirá los cambios (los bloques rojos del diff) antes de confirmar que el cambio es correcto.

### 6. 🔍 Debugging y Comandos de Consola

Para verificar estados o forzar situaciones de prueba, el proyecto expone un proxy de debug seguro.

- **Acceso**: Abrí la consola (`F12`) y usá el objeto `window.__VITE_DEBUG__`.
- **Ejemplos**:
  - `__VITE_DEBUG__.addMoney(9999)`: Sumar dinero.
  - `__VITE_DEBUG__.setWeather('rain')`: Cambiar clima actual.
  - `__VITE_DEBUG__.spawnPokemon(25)`: Aparecer un Pikachu.
- **Auditoría de Batalla**: Si estás debugeando el flujo de combate (FSM), usá:
  - `npm run validate:fsm`: Suite completa de validación (diagramas, implementación y flujo).
  - `npm run validate:fsm:flow`: Busca condiciones de carrera en las transiciones de estados.
- **Seguridad**: Estos comandos están deshabilitados en producción para usuarios normales (ver sección 7).

### 7. 🛡️ Sistema de Seguridad y Moderación (Baneos)

El proyecto incluye un sistema de protección automática (**"Ban Trap"**) para prevenir el uso indebido de herramientas de desarrollo en entornos de producción.

- **Detección Automática**: Si un usuario con rol de `user` intenta invocar métodos de la API de depuración (`window.__VITE_DEBUG__`) o interactuar con el panel de desarrollo en modo **ONLINE**, el sistema:
  1. Marca la cuenta como baneada (`is_banned: true`) en la base de datos.
  2. Registra el motivo del baneo.
  3. Fuerza el cierre inmediato de la sesión.
- **Efecto Visual**: El usuario afectado verá una pantalla de **ACCESO DENEGADO** con estética retro-moderna al intentar iniciar sesión, indicando el motivo de la sanción.
- **Restauración de Cuentas**: El baneo es permanente hasta que un administrador lo revierta utilizando la herramienta de administración de consola (`servers:db:admin`).
  - **Comando para desbanear**:

    ```bash
    npm run servers:db:admin -- --server=nas_franco --action=unban --email=usuario@ejemplo.com
    ```

- **Modo Local**: En modo `offline` (localhost), el sistema de baneo está deshabilitado para permitir el testing sin riesgos.

### 8. 🛡️ Mantenimiento de Usuarios (Admin CLI)

El proyecto cuenta con un gestor unificado de administración de usuarios en consola (`servers:db:admin`) que se conecta de forma nativa a cualquier instancia Supabase (Cloud o NAS) utilizando las credenciales del `.env` maestro, permitiendo realizar operaciones de mantenimiento avanzadas sin necesidad de ingresar al SQL Editor ni escribir consultas manuales.

#### Cambiar Contraseña de un Usuario

Para resetear la contraseña de forma segura (generando automáticamente el hash bcrypt con pygcrypto en el servidor):

```bash
npm run servers:db:admin -- --server=nas_franco --action=set-password --email=usuario@ejemplo.com --password=NUEVA_CONTRASEÑA
```

#### Cambiar Email de un Usuario

El gestor actualiza automáticamente tanto la tabla de autenticación (`auth.users`) como el perfil público (`public.profiles`) en una única transacción DML para mantener la consistencia absoluta:

```bash
npm run servers:db:admin -- --server=nas_franco --action=set-email --email=viejo@email.com --new-email=nuevo@email.com
```

#### Cambiar Nombre de Entrenador (Username)

```bash
npm run servers:db:admin -- --server=nas_franco --action=set-username --email=usuario@ejemplo.com --username=NuevoNombre
```

#### Promoción a Administrador (ADMIN Role)

Para otorgar permisos de administrador a un usuario (acceso a paneles de debug en producción, bypass de ban-traps, etc.):

```bash
npm run servers:db:admin -- --server=nas_franco --action=promote --email=usuario@ejemplo.com
```

> [!IMPORTANT] Los nombres de usuario deben ser únicos. Si el nombre ya está ocupado por otro jugador, la herramienta capturará la restricción `UNIQUE` y mostrará un mensaje de advertencia claro en consola.
