# Plan de Arquitectura: Soporte Dual de Base de Datos (SQLite / PostgreSQL Docker) en Simulaciones E2E y Actualización de `/game-simulation`

## 🎯 Objetivo

Parametrizar las superclases de simulación de Playwright (`BaseE2ESimulation`, `BaseBattleSimulation`, `e2e_helpers.ts`, `DBRouter`) y actualizar la habilidad rectora `@/game-simulation` (`SKILL.md`) para soportar la ejecución dual de base de datos:

1. **`sqlite` (Por defecto)**: Motor ultrarrápido y liviano en memoria/WASM en el navegador, ideal para desarrollo diario, CI rápido y tests de combate sin dependencias externas.
2. **`postgres` / `docker` (Parametrizable)**: Conexión contra el contenedor efímero de PostgreSQL en Docker (`pokevicio-test-postgres` en puerto 54329), ejecutando los procedimientos almacenados reales en PL/pgSQL (`fn_award_event_automated`, `save_game_trusted`, `claim_asset_v2`), políticas RLS y restricciones de clave foránea.

---

## 🏗️ Análisis de Arquitectura y Componentes Actuales

1. **`scripts/testing/run_tests.ts`**:
   Ya implementa el ciclo de vida completo de Docker y PostgreSQL efímero (`findDockerBinary`, `inspectDocker`, `startPostgresContainer`, migración completa de esquemas e inserción de configuración).
2. **`scripts/e2e/base_simulation.ts` & `e2e_helpers.ts`**:
   Actualmente fuerzan `localStorage.setItem('pokevicio_session_mode', 'offline')` y `DBRouter.mode = 'offline'`.
3. **`src/logic/db/dbRouter.ts`**:
   En el constructor, si `isE2E` es verdadero, fuerza incondicionalmente `this.mode = 'offline'`.
4. **`@/game-simulation` (`.agents/skills/game-simulation/SKILL.md`)**:
   Documenta el ciclo de simulación y debe incluir la directiva de ejecución dual de base de datos y comandos oficiales.

---

## 📋 Cambios Propuestos

### 1. Módulo Centralizado de Infraestructura Docker/Postgres para Tests

#### [NEW] [scripts/testing/postgres_test_container.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/scripts/testing/postgres_test_container.ts)

- Extraer y reutilizar de forma modular las funciones de gestión del contenedor PostgreSQL (`pokevicio-test-postgres` en puerto 54329) desde `run_tests.ts`:
  - `ensurePostgresTestContainerReady()`
  - `applyMigrationsToPostgres(postgresUrl)`
  - `stopPostgresTestContainer()`

### 2. Parametrización en Superclases de Simulación

#### [MODIFY] [scripts/e2e/base_simulation.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/scripts/e2e/base_simulation.ts)

- Agregar interfaz de opciones `SimulationOptions`:

  ```ts
  export type SimulationDbDriver = 'sqlite' | 'postgres';
  export interface SimulationOptions {
    driver?: SimulationDbDriver; // Por defecto: process.env.SIM_DB_DRIVER || 'sqlite'
    sqliteKey?: string;
    logBuffer?: string[];
  }
  ```

- Soporte para inicializar `BaseE2ESimulation` y `BaseBattleSimulation` con driver configurable (`sqlite` o `postgres`).
- Métodos auxiliares para ejecutar consultas directas de verificación post-test (`queryTestDb(sql, params)`), abstrayendo si la base subyacente es SQLite en memoria o PostgreSQL vía `postgres.js`.

### 3. Helpers de Autenticación y Sesión E2E

#### [MODIFY] [scripts/e2e/e2e_helpers.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/scripts/e2e/e2e_helpers.ts)

- En `setupE2ESession(page, logBuffer, sqliteKey, driver)`:
  - Inyectar en `window.__E2E_DRIVER__ = driver` ('sqlite' | 'postgres').
  - Si `driver === 'postgres'`:
    - Configurar `pokevicio_session_mode = 'online'`.
    - Configurar `pokevicio_selected_server_id = 'test_postgres'`.
  - Si `driver === 'sqlite'`:
    - Mantener `pokevicio_session_mode = 'offline'`.
- En `loginE2ETestUser`:
  - Si `driver === 'postgres'`, realizar login/registro determinista contra el servidor de pruebas o inyectar la sesión autenticada con JWT de prueba.

### 4. Router de Persistencia (`DBRouter`)

#### [MODIFY] [src/logic/db/dbRouter.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/logic/db/dbRouter.ts)

- Actualizar el constructor para respetar `window.__E2E_DRIVER__`:

  ```ts
  const e2eDriver = (typeof window !== 'undefined' && window.__E2E_DRIVER__) ||
                    (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER) ||
                    'sqlite';

  if (isE2E) {
    if (e2eDriver === 'postgres') {
      this.mode = 'online';
    } else {
      this.mode = 'offline';
      this.options.inMemory = true;
    }
  }
  ```

### 5. Configuración de Servidores Oficiales / Test Server

#### [MODIFY] [src/data/system/official_servers.ts](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/src/data/system/official_servers.ts)

- Incluir la configuración de servidor de testing para entorno E2E / local Docker:

  ```ts
  TEST_DOCKER_SERVER: {
    id: 'test_postgres',
    name: 'Local Docker Test Server',
    url: 'http://127.0.0.1:54329',
    anonKey: '...',
    ...
  }
  ```

### 6. Actualización de Gobernanza en `/game-simulation`

#### [MODIFY] [.agents/skills/game-simulation/SKILL.md](file:///c:/Users/Franco/Trabajos/Juegos/PokeBorrador/.agents/skills/game-simulation/SKILL.md)

- Incorporar la sección de **Ejecución Dual de Base de Datos (SQLite vs PostgreSQL Docker)**:
  - Definición del driver por defecto (`sqlite`) para tests de frontend rápidos y combate.
  - Definición del driver de integración PostgreSQL (`postgres`) para validar procedimientos almacenados PL/pgSQL reales, políticas RLS, restricciones de foreign key y triggers en Docker.
  - Documentación de comandos CLI:
    - **PowerShell**: `$env:SIM_DB_DRIVER="postgres"; npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts --workers=1`
    - **POSIX / Linux / macOS**: `SIM_DB_DRIVER=postgres npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts --workers=1`

---

## 🧪 Plan de Verificación

1. **Verificación de Compatibilidad por Defecto (SQLite)**:
   - Ejecutar simulaciones existentes sin parámetros (`npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts --workers=1`).
   - Comprobar que corren al 100% en SQLite sin ninguna degradación de velocidad.
2. **Verificación de Ejecución en PostgreSQL (Docker)**:
   - Ejecutar la simulación con la variable de entorno:
     `$env:SIM_DB_DRIVER="postgres"; npx playwright test scripts/e2e/events/magikarp_contest_multiusers.simulation.ts --workers=1`
   - Comprobar que el contenedor levanta, aplica las 81 migraciones en PostgreSQL y ejecuta la simulación contra el procedimiento PL/pgSQL real.
3. **Tests de Unidad, Linting y Auditoría**:
   - `npm run lint`
   - `npm run test:node`
   - `npm run audit:dox`
   - `npm run lint:md`
