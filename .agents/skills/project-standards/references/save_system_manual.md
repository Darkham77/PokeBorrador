# Manual del Sistema de Guardado y Sincronización

Este manual garantiza la integridad de los datos de los jugadores y la compatibilidad entre versiones del juego (Supabase + SQLite).

## 🛡️ Reglas de Oro de Persistencia

### 1. Compatibilidad hacia Atrás

Al agregar propiedades a `INITIAL_STATE` (`src/stores/game.js`), los guardados antiguos tendrán `undefined`.

- **Obligatorio**: Usar fallbacks: `state.newFeature = state.newFeature || defaultValue;`.
- **Migraciones**: Si cambias el formato de un dato crítico, implementa un bloque de migración en la inicialización del store.

### 2. Protocolo de Guardado (Upsert)

El guardado en Supabase (`game_saves`) sobrescribe todo el JSON.

- **Defensa**: NUNCA sobrescribas con un estado vacío. Verifica siempre el flag `_saveLoaded` antes de permitir `saveGame()`.
- **Carrera de Guardado**: El `DBRouter` hace competir el guardado local (SQLite/IndexedDB) con la nube. Se prefiere siempre el dato con el timestamp más reciente.

### 3. Integridad del "Real Index"

NUNCA confíes en los índices pasados desde la UI (que pueden estar filtrados o sorteados).

- **Patrón**: Busca siempre el elemento en el array original del Store usando su `UID` antes de aplicar una mutación.

---

## 🏗️ Arquitectura de Datos (DBRouter)

### Sincronización Triple Parity

Si modificas el esquema de la base de datos:

1. Crea la migración SQL en `database/migrations/`.
2. Verifica que el plugin de Vite regenere `src/logic/db/migrations_data.js`.
3. Actualiza el esquema absoluto en `database/schemas/`.

## 🆔 Integridad de UIDs (Anti-Clonación)

- **Unicidad**: Ningún par de Pokémon puede compartir el mismo **Unique ID (UID)** entre el equipo y la caja.
- **Detección**: Si se detectan duplicados en cuentas v1, se sanitizan. En cuentas v2+, una inconsistencia crítica activa el **Protocolo de Rollback**.

---

## 🔒 Conflictos de Sesión (Last-In-Wins)

Cada pestaña del navegador genera un `SessionID` único:

- **Detección de Conflictos**: Si se detecta un cambio en el `current_session_id` de la DB desde otra pestaña, la instancia actual DEBE deshabilitar los permisos de escritura inmediatamente para evitar la corrupción de datos.
- **Notificación**: Se debe disparar el evento `session-conflict` para avisar al usuario.

---

## 🔄 Sincronización Avanzada

### 1. Delta Merge (Post-Combate)

Si el jugador recibe una actualización externa (ej. un intercambio aceptado) mientras está en combate:

- **Diferimiento**: El sistema encola los cambios externos para evitar corromper la pelea activa.
- **Merge**: Tras el combate, el cliente descarga la "verdad" del servidor y aplica los resultados (EXP, Oro) ganados localmente sobre ese nuevo estado.

### 2. Principio de los 60 Segundos

Para optimizar el rendimiento y carga del servidor:

- **Caché Local**: Los cambios menores se acumulan localmente y se sincronizan cada 60 segundos.
- **Eventos Críticos**: Acciones como ganar una medalla, capturar un legendario o realizar un intercambio fuerzan un guardado atómico inmediato.
- **Flush Pre-Acción**: Antes de cualquier acción social, se fuerza un guardado para asegurar que el estado local coincida con el servidor.

---

## 🛡️ Seguridad Administrativa

### 1. Panel de Debug (LocalDebugPanel.vue)

- **Modo Online**: Acceso estrictamente limitado a cuentas con rol `admin`. No debe renderizarse (`v-if`) si el chequeo falla.
- **Protocolo Auto-Ban**: Cualquier intento de llamada no autorizada a comandos CLI administrativos en sesión online dispara el flag `is_banned: true` en la base de datos y fuerza el logout.

### 2. Comandos de Emergencia

- `factoryResetLocal()`: Purga total de storage local.
- `forceSyncCloud()`: Ignora el acelerador de 60s y empuja el estado actual a la nube.

---

## 🏥 Auto-Sanación de Datos

Los Pokémon creados por herramientas de debug o sistemas antiguos pueden carecer de propiedades críticas (`power`, `type`, `pp`).

- **Obligatorio**: Implementar lógica de "Self-Healing" en los puntos de centralización (ej. `recalcPokemonStats` en `pokemonFactory.js`) para rellenar datos faltantes desde `MOVE_DATA`.
