# Manual de Desarrollo: Poké Vicio (Vue 3 + Vite + Supabase)

Este manual detalla los comandos y configuraciones necesarios para trabajar en la versión moderna del juego usando **Vue 3**, **Vite** y **Supabase**. El motor de juego ha sido migrado íntegramente a Vue para máxima reactividad y rendimiento.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado **Node.js (v26.8.1 o superior)** y **npm (v12.0.0 o superior)** en tu sistema.

> [!IMPORTANT] El proyecto utiliza características modernas del motor V8 y requiere explícitamente **Node >= 26.8.1** y **npm >= 12.0.0**. Si la versión instalada es inferior, la ejecución de `npm install` o `npm ci` se interrumpirá inmediatamente lanzando un error con las instrucciones de actualización.

### 🌐 Preparación y Actualización del Entorno (Node.js y npm)

Para inicializar o actualizar automáticamente el entorno (instalación de NVM si falta, Node.js 26+ y npm 12+), ejecuta el script correspondiente desde la raíz del proyecto:

- **En Windows (PowerShell como Administrador)**:

  ```powershell
  PowerShell -ExecutionPolicy Bypass -File .\setup-windows.ps1
  ```

- **En Linux / macOS (Terminal)**:

  ```bash
  chmod +x ./setup-linux.sh && ./setup-linux.sh
  ```

> [!TIP]
> Los scripts leen dinámicamente la versión requerida desde `package.json`, configuran NVM/symlinks automáticamente, actualizan `npm` a la última versión global, aplican las políticas de seguridad y ejecutan `npm ci` para dejar el proyecto 100% listo para desarrollar.

## 🛠️ Entorno de Desarrollo

### 🛡️ Configuración de Seguridad de NPM

Los scripts de preparación (`setup-windows.ps1` y `setup-linux.sh`) aplican estas directivas de seguridad automáticamente. Si necesitas configurarlas o verificarlas manualmente para mitigar riesgos de cadena de suministro (*supply chain attacks*) e inyección de código malicioso:

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

### 🛡️ Calidad, Auditoría e Integridad (Node.js 26+)

El proyecto cuenta con un ecosistema unificado de control de calidad, auditoría estática/dinámica, validadores semánticos de dominio y herramientas de aseguramiento continuo.

#### 🔄 Flujo de Verificación Recomendado

- **Durante el Desarrollo Activo**: Ejecuta `npm run lint` (~3-5 segundos) para comprobaciones rápidas de sintaxis, tipos TypeScript (`vue-tsc`), tipos de dominio, estructuras $O(1)$, estilos y ESLint con `.eslintcache`.
- **Antes de Realizar un Commit**: Ejecuta `npm run audit:warnings-diff` (*Single Source of Truth*) para verificar de forma exhaustiva 0 errores en todo el proyecto y 0 advertencias nuevas contra `origin/main`.

| Comando | Descripción |
| :-- | :-- |
| `npm run lint` | **Fast Developer Lint**: Ejecuta validación de tipos de dominio, $O(1)$, estilos, `vue-tsc`, ESLint con caché y Markdownlint. |
| `npm run lint:fix` | **Auto-Fix de Linter**: Aplica correcciones automáticas de formato y sintaxis con ESLint y Markdownlint. |
| `npm run lint:summary` | **Resumen de Linter**: Muestra un resumen estructurado con el recuento de advertencias y errores en consola. |
| `npm run audit` | **Auditoría Global Unificada**: Ejecuta el 100% de los sub-auditores dinámicamente, mostrando una tabla Box-Drawing en consola y guardando el reporte estructurado JSON en `scratch/audits/latest_audit.json`. |
| `npm run audit:warnings-diff` | **Pre-Commit Gatekeeper**: Compara cambios contra `origin/main` exigiendo 0 errores en el repositorio y 0 advertencias nuevas en archivos modificados. |
| `npm run audit:changed` | **Auditoría de Archivos Modificados**: Ejecuta las suites de auditoría exclusivamente sobre los archivos modificados desde `main`. |
| `npm run audit:fix` | **Auto-corrección de Arquitectura**: Corrige automáticamente timers, sintaxis SASS, capas de render y directivas de importación. |
| `npm run audit:family:domain` | **Auditoría de Dominio**: Valida tipos de dominio, uniones canónicas y estructuras de datos $O(1)$. |
| `npm run audit:family:fsm` | **Auditoría de FSM**: Valida diagramas, implementación dinámica y paridad de flujo de combate. |
| `npm run audit:family:persistence` | **Auditoría de Persistencia**: Valida esquemas SQL, migraciones y serialización de partidas. |
| `npm run audit:family:assets` | **Auditoría de Assets**: Valida colisiones de sprites, nombres canónicos y atlas de texturas. |
| `npm run audit:family:architecture` | **Auditoría Arquitectónica**: Valida modularidad de 500 líneas, tokens SCSS y componentes Vue. |
| `npm run audit:family:docs` | **Auditoría Documental**: Valida enlaces internos, rutas relativas y cumplimiento del framework DOX. |
| `npm run audit:dox` | **Auditoría de DOX**: Valida la jerarquía de archivos `AGENTS.md`, secciones obligatorias, enlaces relativos y ausencia de rutas absolutas. |
| `npm run fallow:health` | **Salud de Código (Fallow)**: Mide el puntaje de salud del repositorio, duplicaciones, hotspots de complejidad y vulnerabilidades CWE. |
| `npm run audit:fallow:triplets` | **Detección de Duplicados**: Escanea bloques de código duplicados o triplicados en todo el proyecto. |
| `npm run audit:css` | **Auditoría de Estilos**: Analiza bundles de SCSS y bloques `<style>` de componentes para detectar reglas redundantes. |
| `npm run audit:sprites` | **Auditoría de Sprites**: Detecta colisiones de identificadores y nombres de sprites en el catálogo de ítems. |

---

### 🔍 Validadores Semánticos de Dominio

Herramientas independientes de validación estricta ejecutadas bajo el modelo de permisos de Node.js 26+:

| Comando | Descripción |
| :-- | :-- |
| `npm run validate:domain-types` | **Domain Types Audit**: Audita el cumplimiento estricto de tipos de dominio y uniones canónicas derivadas (sin `any` ni strings libres). |
| `npm run validate:o1` | **$O(1)$ Optimization Audit**: Garantiza que los accesos en rutas críticas de combate, IA e inventario usen diccionarios y conjuntos $O(1)$. |
| `npm run validate:types` | **Type-Checking**: Ejecuta `vue-tsc --noEmit` para verificar la integridad de tipos en todos los componentes y archivos TypeScript. |
| `npm run validate:component-styles` | **Component Styles Audit**: Verifica el uso de mixins SASS estandarizados, tokens de color y reglas visuales retro-modernas. |
| `npm run validate:sql` | **SQL Integrity**: Valida la sintaxis y ejecución de migraciones SQL contra el motor SQLite nativo (`node:sqlite`). |
| `npm run validate:save-migrations` | **Save Migrations**: Valida las transformaciones de partidas guardadas contra el Dex de Showdown. |
| `npm run validate:markdown-links` | **Markdown Links**: Valida que todos los enlaces relativos y referencias cruzadas en documentación y DOX sean válidos. |
| `npm run validate:items` | **Item Database**: Valida identificadores, categorías, tiers de crafteo e íconos en la base de datos de objetos. |
| `npm run validate:moves` | **Move Integrity**: Valida movimientos, efectos, tipos y learnsets contra el Dex oficial de Pokémon Showdown. |
| `npm run validate:abilities` | **Ability Sync**: Valida habilidades pasivas y de campo contra el motor canónico. |
| `npm run validate:pokemon` | **Pokémon Database**: Valida stats base, ratios de captura, tipos y tablas de evolución. |
| `npm run validate:sprites` | **Sprite Registry**: Verifica la existencia física de sprites animados, miniaturas e íconos de interfaz. |
| `npm run validate:fsm` | **FSM Mastery Audit**: Verifica exhaustivamente diagramas Mermaid, paridad de flujo y controladores FSM. |

---

### 🧪 Tests Automatizados, Fuzzers y Simulaciones E2E

El proyecto cuenta con un sistema de pruebas de 3 niveles: Tests unitarios aislados, Fuzzers multi-hilo de Showdown y Simulaciones E2E en navegador con Playwright.

#### 1. Tests Unitarios y de Lógica

```bash
# Ejecutar toda la batería de tests unitarios y de nodo
npm run test

# Tests unitarios de componentes Vue (JSDOM)
npm run test:unit

# Tests de lógica pura con runner nativo de Node.js 26+
npm run test:node

# Reporte de cobertura de código
npm run test:coverage
```

#### 2. Master Fuzzer de Combate (Showdown Parity)

Los fuzzers ejecutan miles de turnos de combate automatizados con generación procedimental de equipos, detectando desincronizaciones y certificando casos de prueba:

```bash
# Batería completa: Master Fuzzer + E2E Playwright
npm run sim:combat:all

# Master Fuzzer (ejecuta todos los escenarios concurrentemente)
npm run sim:fuzzer

# Fuzzers especializados por subsistema:
npm run sim:fuzzer:moves       # Fuzzer de movimientos y efectos secundarios
npm run sim:fuzzer:abilities   # Fuzzer de habilidades en batalla
npm run sim:fuzzer:items       # Fuzzer de objetos equipables en combate
npm run sim:fuzzer:scenarios   # Fuzzer de escenarios tácticos complejos
npm run sim:fuzzer:breeding    # Fuzzer de guardería, genética y herencia de IVs
npm run sim:fuzzer:missions    # Fuzzer de misiones pasivas y recompensas
npm run sim:fuzzer:gyms        # Fuzzer de líderes de gimnasio y medallas
npm run sim:fuzzer:gts         # Fuzzer de mercado global, intercambios y escrow
npm run sim:fuzzer:ai          # Fuzzer de heurística y toma de decisiones de la IA
npm run sim:fuzzer:trace       # Replayer determinista de casos de error certificados
```

#### 3. Simulaciones E2E Secuenciales (Playwright)

Simulaciones completas en navegador con interfaz gráfica oficial, joystick pasivo y sincronización por eventos:

```bash
# Ejecutar todas las simulaciones E2E secuencialmente una por una
npm run sim:e2e

# Mostrar tabla con el catálogo de simulaciones E2E registradas
npm run sim:e2e:table

# Listar rutas de archivos de simulación E2E
npm run sim:e2e:list

# Simulaciones por módulo específico:
npm run sim:e2e:combat         # Flujo de combate FSM y escenarios tácticos
npm run sim:e2e:ai             # Combate contra IA heurística
npm run sim:e2e:search         # Ciclo de exploración de mapas y encuentros salvajes
npm run sim:e2e:gts            # Intercambios y mercado global (GTS)
npm run sim:e2e:save           # Guardado seguro, persistencia y recarga activa
npm run sim:e2e:breeding       # Ciclo de crianza e incubación de huevos
npm run sim:e2e:missions       # Asignación y recolección de misiones
npm run sim:e2e:gyms           # Desafío y combate en gimnasios
```

---

### 🗄️ Base de Datos, Infraestructura Supabase y Mantenimiento

El proyecto soporta persistencia dual con aislamiento total entre el modo local (SQLite nativo) y los servidores remotos (Supabase / PostgreSQL en Docker o Cloud):

| Comando | Descripción |
| :-- | :-- |
| `npm run db:repair-account` | **Reparación de Cuentas Ilegales**: Corrige Pokémon ilegales (niveles, movimientos o habilidades no permitidas) en una o todas las cuentas, tanto en SQLite local como en servidores Supabase. |
| `npm run admin:rename` | **Renombrado Administrativo**: Cambia el nombre de entrenador de un usuario en Supabase directamente desde consola. |
| `npm run servers:configure` | **Sincronización de Servidores**: Parsea el `.env` maestro y genera la lista tipada de servidores en `src/data/official_servers.ts`. |
| `npm run servers:db:update` | **Gestor y Migrador**: Aplica esquemas iniciales y migraciones SQL incrementales en el servidor Supabase elegido o en todos (`--all`). |
| `npm run servers:db:backup` | **Generador de Respaldos**: Conecta al servidor Supabase y exporta todas las tablas a un archivo JSON estructurado. |
| `npm run servers:db:restore` | **Restaurador Transaccional**: Restaura transaccionalmente un respaldo JSON hacia el servidor Supabase elegido. |
| `npm run servers:db:local-import` | **Importador SQLite**: Importa el respaldo JSON más reciente de Supabase a la base de datos local SQLite para pruebas offline. |
| `npm run servers:db:admin` | **Administración de Usuarios**: Permite desbanear, cambiar contraseñas, actualizar emails o promover a admin desde consola. |
| `npm run supabase:manage` | **Gestor Docker/CLI**: Orquestador local de contenedores Supabase y compilación de imágenes Docker. |
| `npm run migrations:generate` | **Compilador de Migraciones**: Escanea `database/migrations/` y compila el manifiesto TypeScript de producción. |
| `npm run sync:test` | **Sincronización a Repo Hermano**: Sincroniza el árbol de fuentes con el repositorio hermano `pokevicio-test`. |

---

### 🔧 Herramienta de Reparación de Cuentas Ilegales (`db:repair-account`)

Esta herramienta escanea las partidas guardadas en `game_saves`, audita todos los Pokémon del equipo y de las cajas contra el motor de reglas de Showdown, repara cualquier inconsistencia (niveles > 100, movimientos no permitidos para la especie/learnset, habilidades no canónicas) y persiste las correcciones de forma transaccional.

#### 1. Uso en Base de Datos Local (SQLite)

```bash
# Reparar una cuenta específica por su ID de usuario:
npm run db:repair-account -- --user=local_ash

# Reparar TODAS las cuentas registradas en SQLite local, una por una:
npm run db:repair-account -- --all

# Especificar una ruta de base de datos SQLite personalizada:
npm run db:repair-account -- --db=tests/fixtures/poke_local_ash.db --all
```

#### 2. Uso en Servidores Supabase / PostgreSQL Remotos

```bash
# Reparar una cuenta específica en un servidor Supabase (por UUID, username o email):
npm run db:repair-account -- --server=server_franco --user=Ash
npm run db:repair-account -- --server=nas_franco --user=usuario@ejemplo.com

# Reparar TODAS las cuentas registradas en el servidor Supabase:
npm run db:repair-account -- --server=server_franco --all
npm run db:repair-account -- --server=nas_franco --all
```

---

#### Ejemplos de Uso de Infraestructura de Servidores

```bash
# 1. Sincronizar servidores en la interfaz del juego
npm run servers:configure

# 2. Inicializar o actualizar base de datos en un servidor específico con flags explícitos
npm run servers:db:update -- --server=nas_franco

# 3. Actualizar base de datos en TODOS los servidores configurados en el .env
npm run servers:db:update -- --all

# 4. Descargar un respaldo completo en formato JSON de un servidor
npm run servers:db:backup -- --server=nas_franco

# 5. Restaurar el respaldo más reciente de forma automática a un servidor
npm run servers:db:restore -- --server=nas_franco

# 6. Restaurar un respaldo específico pasándole la ruta exacta del archivo
npm run servers:db:restore -- --server=nas_franco --file=database/backups/nas_franco/nas_franco_backup_2026-05-17T05-29-09.json
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
npm run validate:types    # Verificación estricta de tipos TypeScript
npm run test              # Unit tests de UI y componentes (Vitest)
npm run build             # Compilación para producción
npm run assets:download   # Descarga sprites y recursos externos (Gen 1-9, Items, Trainers)
npm run sync:test         # Sincroniza el código fuente al repo hermano pokevicio-test para QA
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

# Descarga selectiva limpia (soporte posicional nativo)
npm run assets:download items        # Solo ítems (o npm run assets:download:items)
npm run assets:download pokemon      # Solo Pokémon (Front/Back/Shiny)
npm run assets:download trainers     # Solo entrenadores
npm run assets:download 151         # Solo primera generación (límite posicional)
```

> [!NOTE] Los recursos se descargan en la carpeta `external_assets/`. Estos archivos están fuera del pipeline automático de `_raw-assets` por defecto para evitar duplicación masiva, pero podés moverlos manualmente si necesitás procesarlos.

### 🖼️ Pipeline de Assets

Procesa todas las imágenes de `_raw-assets`, las convierte a WebP y las espeja en la estructura del proyecto:

```bash
npm run assets:convert
```

> [!TIP] El script detecta automáticamente si un asset es Pixel Art (basado en carpetas como `sprites/` o `icons/`) para aplicar compresión **Lossless**. Para el resto, aplica una calidad adaptativa basada en la resolución.

---

## 📂 Estructura del Proyecto

- `/src`: Código fuente de la aplicación (Componentes, Stores, Vistas).
- `/public`: Activos estáticos (Assets, Mapas).
- `/api`: Funciones serverless para el backend.
- `/database`: Esquemas SQL y migraciones.
- `/tests`: Suite de pruebas (Vitest y Playwright).
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

Para resetear la contraseña de forma segura (generando automáticamente el hash bcrypt en el servidor):

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
